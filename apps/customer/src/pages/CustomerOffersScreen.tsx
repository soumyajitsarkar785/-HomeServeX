import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface CustomerOffersScreenProps {
  onNavigate: (screen: string, params?: any) => void;
}

export const CustomerOffersScreen: React.FC<CustomerOffersScreenProps> = ({ onNavigate }) => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [claimedOffer, setClaimedOffer] = useState<string | null>(null);

  const categories = ['All', 'AC', 'Appliances', 'Cleaning'];

  const [offers, setOffers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fallbackOffers = [
    {
      id: 'offer-1',
      title: 'AC Service Discount',
      description: 'Get ₹200 OFF on AC service',
      minOrder: 'Min. order ₹999',
      validity: 'Valid till 31 Mar 2025',
      category: 'AC',
      code: 'AC200',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'offer-2',
      title: 'Flat 15% OFF',
      description: 'on All Appliance Repairs',
      minOrder: 'Min. order ₹499',
      validity: 'Valid till 31 Mar 2025',
      category: 'Appliances',
      code: 'FLAT15',
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'offer-3',
      title: 'Free Inspection',
      description: 'on First Booking',
      minOrder: 'Zero minimum order',
      validity: 'Valid till 31 Mar 2025',
      category: 'Appliances',
      code: 'FREEINSPECT',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'offer-4',
      title: 'Deep Cleaning Special',
      description: 'Get ₹300 OFF on Full Home Cleaning',
      minOrder: 'Min. order ₹1499',
      validity: 'Valid till 31 Mar 2025',
      category: 'Cleaning',
      code: 'CLEAN300',
      imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 'offer-5',
      title: 'Water Purifier Filter Care',
      description: 'Flat 20% OFF on RO Membrane & Filters',
      minOrder: 'Min. order ₹599',
      validity: 'Valid till 31 Mar 2025',
      category: 'Appliances',
      code: 'RO20',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=300&q=80',
    },
  ];

  React.useEffect(() => {
    setIsLoading(true);
    fetch('/api/v1/services/offers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          setOffers(data.data);
        } else {
          setOffers(fallbackOffers);
        }
      })
      .catch(() => setOffers(fallbackOffers))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredOffers = offers.filter((o) => activeCategory === 'All' || o.category === activeCategory);

  const handleGetOffer = (code: string) => {
    navigator.clipboard.writeText(code);
    setClaimedOffer(code);
    setTimeout(() => setClaimedOffer(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', paddingBottom: '90px' }}>

      {/* Hero Banner Card */}
      <div
        style={{
          backgroundColor: '#0E3E2F',
          borderRadius: '16px',
          padding: '20px',
          color: '#FFFFFF',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(14, 62, 47, 0.25)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 2, maxWidth: '70%' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#86EFAC',
              marginBottom: '4px',
              letterSpacing: '0.05em',
            }}
          >
            EXCLUSIVE DEALS
          </div>
          <h3
            style={{
              fontSize: '20px',
              fontWeight: 800,
              lineHeight: 1.25,
              margin: '0 0 6px 0',
              color: '#FFFFFF',
            }}
          >
            Save More on Home Services
          </h3>
          <p style={{ fontSize: '11px', color: '#D1EAE0', margin: 0 }}>
            Instant promo discounts applied directly at checkout.
          </p>
        </div>

        {/* Voucher Tag Icon Graphic */}
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '52px',
            opacity: 0.9,
          }}
        >
          🎟️
        </div>
      </div>

      {/* Category Filter Pills */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none',
        }}
      >
        {categories.map((cat) => {
          const isSelected = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 18px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                backgroundColor: isSelected ? '#0E3E2F' : '#EAF4EF',
                color: isSelected ? '#FFFFFF' : '#334155',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Offer Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#16A34A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading exclusive promo offers...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {filteredOffers.map((offer) => (
            <div
              key={offer.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              {/* Left Content */}
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A', margin: '0 0 4px 0' }}>
                  {offer.title}
                </h4>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A', marginBottom: '4px' }}>
                  {offer.description}
                </div>
                <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '2px' }}>
                  {offer.minOrder}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8' }}>
                  {offer.validity}
                </div>

                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleGetOffer(offer.code)}
                    style={{
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icons.Tag size={12} color="#FFFFFF" />
                    {claimedOffer === offer.code ? 'Copied Code!' : `Code: ${offer.code}`}
                  </button>
                  <button
                    onClick={() => onNavigate('services')}
                    style={{
                      backgroundColor: '#EAF4EF',
                      color: '#0E3E2F',
                      border: '1px solid #137A59',
                      borderRadius: '20px',
                      padding: '6px 14px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Book Now
                  </button>
                </div>
              </div>

              {/* Right Image Thumbnail */}
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: '#F1F5F9',
                }}
              >
                <img
                  src={offer.imageUrl}
                  alt={offer.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
