import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:http/http.dart' as http;
import 'package:flutter_polyline_points/flutter_polyline_points.dart';

class UserBookingTrackingScreen extends StatefulWidget {
  final String bookingId;
  final String apiBaseUrl; // e.g. "https://api.homeservex.com"

  const UserBookingTrackingScreen({
    Key? key,
    required this.bookingId,
    this.apiBaseUrl = "http://10.0.2.2:5000",
  }) : super(key: key);

  @override
  State<UserBookingTrackingScreen> createState() => _UserBookingTrackingScreenState();
}

class _UserBookingTrackingScreenState extends State<UserBookingTrackingScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
  // Booking Status Lifecycle
  String _status = 'PENDING_ACCEPTANCE'; // 'PENDING_ACCEPTANCE', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'
  String _referenceNumber = '';
  String _startOtp = '4821';
  String _serviceTitle = 'Split AC Power Jet Cleaning';
  String _streetAddress = '221B Baker Street, London';
  int _totalAmountCents = 82500; // ₹825.00

  // Provider Details
  String _providerName = 'Ramesh Kumar';
  String _providerPhone = '+91 98201 98765';
  String _vehicleInfo = 'Hero Electric (MH 02 CD 4821)';

  // Navigation & Metrics
  int _etaMinutes = 12;
  double _distanceKm = 2.4;

  // Real-Time Socket.io Connection
  late IO.Socket _socket;

  // Google Maps State
  GoogleMapController? _mapController;
  LatLng _userDestination = const LatLng(51.523758, -0.158555); // Latitude FIRST, Longitude SECOND
  LatLng _currentProviderPosition = const LatLng(51.5360, -0.1730);
  double _currentProviderBearing = 0.0;
  Set<Polyline> _polylines = {};

  // Silky-Smooth Marker Animation Controllers (Rapido / Uber Mechanic)
  late AnimationController _markerAnimationController;
  Animation<double>? _markerAnimation;
  LatLng _markerStartPos = const LatLng(51.5360, -0.1730);
  LatLng _markerEndPos = const LatLng(51.5360, -0.1730);
  double _markerStartBearing = 0.0;
  double _markerEndBearing = 0.0;

  @override
  void initState() {
    super.initState();
    WidgetsBindingObserver;
    WidgetsBinding.instance.addObserver(this);

    _markerAnimationController = AnimationController(
      duration: const Duration(milliseconds: 2800),
      vsync: this,
    );

    // Initial state sync from REST API + Socket connection
    _fetchLiveStateRecovery();
    _initSocketConnection();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _markerAnimationController.dispose();
    _socket.disconnect();
    _socket.dispose();
    super.dispose();
  }

  // Handle app minimize / resume state recovery
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _fetchLiveStateRecovery();
      if (!_socket.connected) {
        _socket.connect();
      }
    }
  }

  /// 1. App Kill / Reconnection State Recovery REST Endpoint
  Future<void> _fetchLiveStateRecovery() async {
    try {
      final res = await http.get(
        Uri.parse('${widget.apiBaseUrl}/api/bookings/${widget.bookingId}/live-state'),
      );
      if (res.statusCode == 200) {
        final json = jsonDecode(res.body);
        if (json['success'] == true && json['data'] != null) {
          final data = json['data'];
          setState(() {
            _status = data['status'] ?? 'PENDING_ACCEPTANCE';
            _referenceNumber = data['referenceNumber'] ?? widget.bookingId;
            _startOtp = data['startOtp'] ?? '4821';

            if (data['destination'] != null) {
              _userDestination = LatLng(
                (data['destination']['latitude'] as num).toDouble(),
                (data['destination']['longitude'] as num).toDouble(),
              );
              _streetAddress = data['destination']['address'] ?? _streetAddress;
            }

            if (data['provider'] != null) {
              _providerName = data['provider']['name'] ?? _providerName;
              _providerPhone = data['provider']['phone'] ?? _providerPhone;
              _vehicleInfo = data['provider']['vehicle'] ?? _vehicleInfo;

              if (data['provider']['location'] != null) {
                final lat = (data['provider']['location']['latitude'] as num).toDouble();
                final lng = (data['provider']['location']['longitude'] as num).toDouble();
                _currentProviderPosition = LatLng(lat, lng);
                _currentProviderBearing = (data['provider']['location']['heading'] as num?)?.toDouble() ?? 0.0;
              }
            }

            if (data['route'] != null) {
              _etaMinutes = (data['route']['etaMinutes'] as num?)?.toInt() ?? _etaMinutes;
              _distanceKm = (data['route']['distanceKm'] as num?)?.toDouble() ?? _distanceKm;

              final encodedPoly = data['route']['polyline'] as String?;
              if (encodedPoly != null && encodedPoly.isNotEmpty) {
                _decodeAndDrawPolyline(encodedPoly);
              }
            }
          });
        }
      }
    } catch (_) {}
  }

  /// 2. Initialize Real-Time Socket Connection & Event Handlers
  void _initSocketConnection() {
    _socket = IO.io(widget.apiBaseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });

    _socket.connect();

    _socket.onConnect((_) {
      // Join booking room
      _socket.emit('join_booking_room', {
        'bookingId': widget.bookingId,
        'role': 'CUSTOMER',
      });
    });

    // Event: Booking Accepted -> Transition from Awaiting View to Live Map View!
    _socket.on('booking_accepted', (data) {
      if (mounted) {
        setState(() {
          _status = 'ACCEPTED';
          _startOtp = data['startOtp'] ?? '4821';
          if (data['provider'] != null) {
            _providerName = data['provider']['name'] ?? _providerName;
            _providerPhone = data['provider']['phone'] ?? _providerPhone;
            _vehicleInfo = data['provider']['vehicleInfo'] ?? _vehicleInfo;

            if (data['provider']['location'] != null) {
              _currentProviderPosition = LatLng(
                (data['provider']['location']['latitude'] as num).toDouble(),
                (data['provider']['location']['longitude'] as num).toDouble(),
              );
            }
          }
          if (data['route'] != null) {
            _etaMinutes = (data['route']['etaMinutes'] as num?)?.toInt() ?? 12;
            final poly = data['route']['polyline'] as String?;
            if (poly != null) _decodeAndDrawPolyline(poly);
          }
        });
      }
    });

    // Event: Live Location Stream (Throttled GPS updates from Provider every 3-5s)
    _socket.on('live_location_stream', (data) {
      if (!mounted) return;
      final newLat = (data['latitude'] as num).toDouble();
      final newLng = (data['longitude'] as num).toDouble();
      final targetPos = LatLng(newLat, newLng);

      final newBearing = (data['heading'] != null)
          ? (data['heading'] as num).toDouble()
          : _calculateBearing(_currentProviderPosition, targetPos);

      _animateProviderMarker(targetPos, newBearing);

      setState(() {
        if (data['etaMinutes'] != null) _etaMinutes = (data['etaMinutes'] as num).toInt();
        if (data['distanceKm'] != null) _distanceKm = (data['distanceKm'] as num).toDouble();
      });
    });

    // Event: Status Lifecycle Changes (ARRIVED, IN_PROGRESS, COMPLETED)
    _socket.on('status_changed', (data) {
      if (mounted) {
        setState(() {
          _status = data['status'] ?? _status;
        });
      }
    });
  }

  /// 3. Decode Encoded Polyline string and render on Map
  void _decodeAndDrawPolyline(String encoded) {
    try {
      final polylinePoints = PolylinePoints();
      final List<PointLatLng> result = polylinePoints.decodePolyline(encoded);
      if (result.isNotEmpty) {
        final List<LatLng> polylineCoordinates = result
            .map((point) => LatLng(point.latitude, point.longitude))
            .toList();

        setState(() {
          _polylines = {
            Polyline(
              polylineId: const PolylineId('route_polyline'),
              color: const Color(0xFF16A34A),
              points: polylineCoordinates,
              width: 5,
              jointType: JointType.round,
              endCap: Cap.roundCap,
              startCap: Cap.roundCap,
            ),
          };
        });
      }
    } catch (_) {}
  }

  /// 4. Silky-Smooth Marker Linear Interpolation (Lat/Lng Tweening)
  void _animateProviderMarker(LatLng targetPosition, double targetBearing) {
    _markerStartPos = _currentProviderPosition;
    _markerEndPos = targetPosition;
    _markerStartBearing = _currentProviderBearing;
    _markerEndBearing = targetBearing;

    _markerAnimationController.reset();
    _markerAnimation = CurvedAnimation(
      parent: _markerAnimationController,
      curve: Curves.easeInOutCubic,
    );

    _markerAnimation!.addListener(() {
      final t = _markerAnimation!.value;
      final interpolatedLat = _markerStartPos.latitude + (_markerEndPos.latitude - _markerStartPos.latitude) * t;
      final interpolatedLng = _markerStartPos.longitude + (_markerEndPos.longitude - _markerStartPos.longitude) * t;
      final interpolatedBearing = _markerStartBearing + (_markerEndBearing - _markerStartBearing) * t;

      setState(() {
        _currentProviderPosition = LatLng(interpolatedLat, interpolatedLng);
        _currentProviderBearing = interpolatedBearing;
      });
    });

    _markerAnimationController.forward();
  }

  /// 5. Mathematical Bearing Calculation between 2 GPS Points
  double _calculateBearing(LatLng start, LatLng end) {
    final startLat = start.latitude * (math.pi / 180.0);
    final startLng = start.longitude * (math.pi / 180.0);
    final endLat = end.latitude * (math.pi / 180.0);
    final endLng = end.longitude * (math.pi / 180.0);

    final dLng = endLng - startLng;
    final y = math.sin(dLng) * math.cos(endLat);
    final x = math.cos(startLat) * math.sin(endLat) -
        math.sin(startLat) * math.cos(endLat) * math.cos(dLng);

    final radians = math.atan2(y, x);
    return (radians * (180.0 / math.pi) + 360.0) % 360.0;
  }

  // ==========================================================================
  // UI BUILDERS: CONDITIONAL GATING (PENDING_ACCEPTANCE vs LIVE TRACKING)
  // ==========================================================================

  @override
  Widget build(BuildContext context) {
    // CRITICAL ARCHITECTURAL RULE:
    // If status == PENDING_ACCEPTANCE: DO NOT MOUNT GoogleMap widget!
    // Render clean searching view with price breakdown and waiting radar.
    if (_status == 'PENDING_ACCEPTANCE') {
      return _buildPendingWaitingView();
    }

    // Status >= ACCEPTED: Render Live Route Map & Uber-Style Driver Card
    return _buildLiveTrackingMapView();
  }

  /// VIEW A: Awaiting Provider Acceptance (NO MAP)
  Widget _buildPendingWaitingView() {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Color(0xFF0F172A)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Matching Specialist',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w800, fontSize: 16),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 24),
              // Animated Pulse Radar
              Center(
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF16A34A).withOpacity(0.15),
                      ),
                    ),
                    Container(
                      width: 65,
                      height: 65,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: const Color(0xFF16A34A).withOpacity(0.25),
                      ),
                    ),
                    const CircleAvatar(
                      radius: 24,
                      backgroundColor: Color(0xFF16A34A),
                      child: Icon(Icons.search, color: Colors.white, size: 26),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text(
                'Finding Nearby Professional...',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 6),
              const Text(
                'Dispatching your order to verified certified technicians within 5 km. Once accepted, live GPS tracking begins.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
              ),
              const SizedBox(height: 24),

              // Booking Details Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('SERVICE DETAILS', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                        Text('Ref: ${_referenceNumber.isNotEmpty ? _referenceNumber : widget.bookingId}', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Color(0xFF16A34A))),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(_serviceTitle, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.location_on, size: 16, color: Color(0xFFD97706)),
                        const SizedBox(width: 6),
                        Expanded(child: Text(_streetAddress, style: const TextStyle(fontSize: 12, color: Color(0xFF475569)), overflow: TextOverflow.ellipsis)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Transparent Price Breakdown
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Base Inspection & Jet Wash', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        Text('₹750', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Urban Kit & Protective Masking', style: TextStyle(fontSize: 13, color: Color(0xFF64748B))),
                        Text('₹75', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                      ],
                    ),
                    const Divider(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Estimated Payable', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF0F172A))),
                        Text('₹${(_totalAmountCents / 100).toStringAsFixed(0)}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0E3E2F))),
                      ],
                    ),
                  ],
                ),
              ),
              const Spacer(),

              // Cancel Button
              SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  child: const Text('Cancel Request', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// VIEW B: Live Google Maps Tracking & Driver Telemetry Sheet
  Widget _buildLiveTrackingMapView() {
    final markers = <Marker>{
      // User Doorstep Marker (Fixed)
      Marker(
        markerId: const MarkerId('user_destination'),
        position: _userDestination,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueGreen),
        infoWindow: InfoWindow(title: 'Your Doorstep', snippet: _streetAddress),
      ),
      // Dynamic Provider Marker (Animated with Bearing)
      Marker(
        markerId: const MarkerId('provider_marker'),
        position: _currentProviderPosition,
        rotation: _currentProviderBearing,
        anchor: const Offset(0.5, 0.5),
        flat: true,
        icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueCyan),
        infoWindow: InfoWindow(title: _providerName, snippet: _vehicleInfo),
      ),
    };

    return Scaffold(
      body: Stack(
        children: [
          // Google Map Widget
          GoogleMap(
            initialCameraPosition: CameraPosition(target: _userDestination, zoom: 14.5),
            markers: markers,
            polylines: _polylines,
            myLocationButtonEnabled: false,
            zoomControlsEnabled: false,
            onMapCreated: (controller) => _mapController = controller,
          ),

          // Floating Top Status Badge
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A).withOpacity(0.92),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: const [BoxShadow(color: Colors.black26, blurRadius: 8)],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: _status == 'ARRIVED' ? const Color(0xFFFBBF24) : const Color(0xFF86EFAC),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      _status == 'ARRIVED'
                          ? 'Technician has arrived at door!'
                          : _status == 'IN_PROGRESS'
                              ? 'Service in Progress'
                              : 'Arriving in ~$_etaMinutes mins (${_distanceKm.toStringAsFixed(1)} km)',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ],
                ),
              ),
            ),
          ),

          // Uber/Rapido-Style Unified White Bottom Sheet
          Positioned(
            left: 0,
            right: 0,
            bottom: 0,
            child: _buildDriverBottomSheet(),
          ),
        ],
      ),
    );
  }

  Widget _buildDriverBottomSheet() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 16)],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Row 1: Technician Profile Header
          Row(
            children: [
              const CircleAvatar(
                radius: 24,
                backgroundColor: Color(0xFFEAF4EF),
                child: Text('SS', style: TextStyle(color: Color(0xFF0E3E2F), fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(_providerName, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A))),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: const Color(0xFFDCFCE7), borderRadius: BorderRadius.circular(4)),
                          child: const Text('VERIFIED PRO', style: TextStyle(color: Color(0xFF15803D), fontSize: 9, fontWeight: FontWeight.w800)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('★ 4.9 (428 jobs) • $_vehicleInfo', style: const TextStyle(color: Color(0xFF64748B), fontSize: 12)),
                  ],
                ),
              ),
              CircleAvatar(
                backgroundColor: const Color(0xFFF0FDF4),
                child: IconButton(
                  icon: const Icon(Icons.phone, color: Color(0xFF16A34A), size: 20),
                  onPressed: () {},
                ),
              ),
            ],
          ),
          const Divider(height: 24),

          // Row 2: Secure Start OTP Handshake Chip
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('DOORSTEP START OTP', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w800, color: Color(0xFF64748B))),
                    Text(_startOtp, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: 4, fontFamily: 'monospace', color: Color(0xFF166534))),
                  ],
                ),
                const Chip(
                  label: Text('Share with Tech at Door', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Color(0xFF15803D))),
                  backgroundColor: Colors.white,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
