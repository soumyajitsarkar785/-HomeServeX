import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:socket_io_client/socket_io_client.dart' as IO;

class ProviderLocationStreamer {
  final String apiBaseUrl;
  final String providerId;
  final String authToken;

  late IO.Socket socket;
  StreamSubscription<Position>? _positionStreamSubscription;
  Timer? _heartbeatTimer;

  String? _activeBookingId;
  bool _isStreaming = false;

  // Last broadcast coordinates to prevent duplicate packet transmissions
  Position? _lastStreamedPosition;

  ProviderLocationStreamer({
    required this.apiBaseUrl,
    required this.providerId,
    required this.authToken,
  }) {
    _initSocket();
  }

  void _initSocket() {
    socket = IO.io(apiBaseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
      'extraHeaders': {'Authorization': 'Bearer $authToken'},
    });

    socket.connect();

    socket.onConnect((_) {
      debugPrint('[ProviderStreamer] Connected to tracking gateway');
      // Register personal provider dispatch room
      socket.emit('join_booking_room', {
        'bookingId': 'provider:$providerId',
        'role': 'PROVIDER',
      });
    });

    socket.onDisconnect((_) {
      debugPrint('[ProviderStreamer] Disconnected from gateway');
    });
  }

  /// 1. Accept Booking via Atomic REST API
  Future<bool> acceptBooking(String bookingId) async {
    try {
      final res = await http.post(
        Uri.parse('$apiBaseUrl/api/bookings/$bookingId/accept'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({'providerId': providerId}),
      );

      if (res.statusCode == 200) {
        _activeBookingId = bookingId;

        // Join active booking room on socket
        socket.emit('join_booking_room', {
          'bookingId': bookingId,
          'role': 'PROVIDER',
        });

        // Start high-precision GPS streaming to user
        await startLocationStreaming(bookingId);
        return true;
      } else if (res.statusCode == 409) {
        debugPrint('[ProviderStreamer] Booking taken by another technician.');
        return false;
      }
      return false;
    } catch (e) {
      debugPrint('[ProviderStreamer] acceptBooking error: $e');
      return false;
    }
  }

  /// 2. Battery-Optimized Geolocation Streaming (Distance Filter: 10 meters)
  Future<void> startLocationStreaming(String bookingId) async {
    if (_isStreaming) return;

    // Check & request location permissions
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      await Geolocator.openLocationSettings();
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _isStreaming = true;
    _activeBookingId = bookingId;

    // High accuracy with 10-meter distance filter (Anti-Drain Optimization)
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Only trigger callback when device moved at least 10 meters
    );

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _lastStreamedPosition = position;
      _emitLocationPacket(bookingId, position);
    });

    // Fallback Timer: If technician is waiting at a red light, emit keepalive every 5 seconds
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_lastStreamedPosition != null && _isStreaming) {
        _emitLocationPacket(bookingId, _lastStreamedPosition!);
      }
    });
  }

  void _emitLocationPacket(String bookingId, Position position) {
    if (!socket.connected) return;

    socket.emit('provider_location_update', {
      'bookingId': bookingId,
      'providerId': providerId,
      'latitude': position.latitude,
      'longitude': position.longitude,
      'heading': position.heading,
      'speed': (position.speed * 3.6).round(), // Convert m/s to km/h
    });
  }

  /// 3. Mark Arrived at Customer Doorstep
  Future<bool> markArrived(String bookingId) async {
    try {
      socket.emit('order_status_update', {
        'bookingId': bookingId,
        'status': 'ARRIVED',
        'providerId': providerId,
      });

      // Stop high-frequency GPS stream to save battery once arrived at doorstep
      stopLocationStreaming();
      return true;
    } catch (_) {
      return false;
    }
  }

  /// 4. Verify Start OTP (Customer 4-digit code) to begin service
  Future<bool> verifyStartOtp(String bookingId, String otpCode) async {
    try {
      final res = await http.post(
        Uri.parse('$apiBaseUrl/api/bookings/$bookingId/verify-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'otpCode': otpCode.trim(),
          'purpose': 'START_SERVICE',
        }),
      );
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// 5. Complete Job & Release Availability
  Future<bool> completeJob(String bookingId, String completionOtp) async {
    try {
      final res = await http.post(
        Uri.parse('$apiBaseUrl/api/bookings/$bookingId/verify-otp'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
        },
        body: jsonEncode({
          'otpCode': completionOtp.trim(),
          'purpose': 'COMPLETE_SERVICE',
        }),
      );

      if (res.statusCode == 200) {
        stopLocationStreaming();
        _activeBookingId = null;
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }

  /// 6. Stop GPS Stream
  void stopLocationStreaming() {
    _isStreaming = false;
    _positionStreamSubscription?.cancel();
    _positionStreamSubscription = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  void dispose() {
    stopLocationStreaming();
    socket.disconnect();
    socket.dispose();
  }

  /// 7. Ingest GPS Telemetry to REST Backend with H3 Cell Computation & Adaptive Frequency
  Future<Map<String, dynamic>?> sendLocationPing(Position position) async {
    try {
      final res = await http.post(
        Uri.parse('$apiBaseUrl/api/v1/providers/location'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $authToken',
          'x-role': 'PROVIDER',
          'x-app': 'partner',
        },
        body: jsonEncode({
          'latitude': position.latitude,
          'longitude': position.longitude,
          'accuracyMeters': position.accuracy,
          'speedKmh': (position.speed * 3.6).round(),
          'headingDegrees': position.heading,
        }),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['data'] as Map<String, dynamic>?;
      }
      return null;
    } catch (e) {
      debugPrint('[ProviderStreamer] sendLocationPing error: $e');
      return null;
    }
  }

  /// 8. Persistent Offer Recovery across App Restarts & Network Disconnects
  Future<List<Map<String, dynamic>>> fetchPendingOffers() async {
    try {
      final res = await http.get(
        Uri.parse('$apiBaseUrl/api/v1/providers/offers/pending'),
        headers: {
          'Authorization': 'Bearer $authToken',
          'x-role': 'PROVIDER',
          'x-app': 'partner',
        },
      );

      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['data'] is List) {
          return List<Map<String, dynamic>>.from(json['data']);
        }
      }
      return [];
    } catch (e) {
      debugPrint('[ProviderStreamer] fetchPendingOffers error: $e');
      return [];
    }
  }
}
