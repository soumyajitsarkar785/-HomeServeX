import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface CustomerServicesListScreenProps {
  onNavigate: (screen: string, params?: any) => void;
  initialCategory?: string;
  initialSearch?: string;
}

export const CustomerServicesListScreen: React.FC<CustomerServicesListScreenProps> = ({
  onNavigate,
  initialCategory,
  initialSearch,
}) => {
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'All');
  const [searchQuery, setSearchQuery] = useState(initialSearch || '');

  React.useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setSearchQuery(initialSearch);
    }
  }, [initialSearch]);

  const defaultPills = [
    'All',
    'AC',
    'Appliances',
    'Cleaning',
    'Electrical',
    'Plumbing',
    'Carpentry',
    'Pest Control',
    'Painting',
  ];

  const [filterPills, setFilterPills] = useState<string[]>(defaultPills);

  const services = [
    {
      id: 'svc-1',
      title: 'AC Service & Jet Cleaning',
      category: 'AC',
      price: 'From ₹499',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
      slug: 'split-ac-regular-service',
    },
    {
      id: 'svc-2',
      title: 'Washing Machine Repair & Overhaul',
      category: 'Appliances',
      price: 'From ₹449',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=400&q=80',
      slug: 'washing-machine-overhaul',
    },
    {
      id: 'svc-3',
      title: 'Refrigerator Diagnostics & Gas Recharge',
      category: 'Appliances',
      price: 'From ₹549',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&w=400&q=80',
      slug: 'fridge-cooling-diagnostics',
    },
    {
      id: 'svc-4',
      title: 'Microwave Oven Magnetron Repair',
      category: 'Appliances',
      price: 'From ₹399',
      duration: '⏱ 30 mins',
      imageUrl: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&w=400&q=80',
      slug: 'microwave-heating-repair',
    },
    {
      id: 'svc-5',
      title: 'Water Purifier RO Filter & Membrane Service',
      category: 'Appliances',
      price: 'From ₹499',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=400&q=80',
      slug: 'ro-filter-service',
    },
    {
      id: 'svc-6',
      title: 'Geyser & Water Heater Maintenance',
      category: 'Appliances',
      price: 'From ₹399',
      duration: '⏱ 30 mins',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
      slug: 'geyser-service',
    },
    {
      id: 'svc-7',
      title: 'Kitchen Chimney & Hob Deep Cleaning',
      category: 'Appliances',
      price: 'From ₹699',
      duration: '⏱ 60 mins',
      imageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
      slug: 'kitchen-deep-degreasing',
    },
    {
      id: 'svc-8',
      title: 'Smart & LED TV Installation & Repair',
      category: 'Appliances',
      price: 'From ₹499',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=400&q=80',
      slug: 'tv-repair-service',
    },
    {
      id: 'svc-9',
      title: 'Intensive Bathroom Tile & Grout Scrub',
      category: 'Cleaning',
      price: 'From ₹599',
      duration: '⏱ 90 mins',
      imageUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=80',
      slug: 'deep-bathroom-cleaning',
    },
    {
      id: 'svc-10',
      title: 'Sofa & Carpet Upholstery Shampooing',
      category: 'Cleaning',
      price: 'From ₹799',
      duration: '⏱ 90 mins',
      imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=400&q=80',
      slug: 'sofa-carpet-cleaning',
    },
    {
      id: 'svc-11',
      title: 'Switchboard & Short Circuit Repair',
      category: 'Electrical',
      price: 'From ₹249',
      duration: '⏱ 30 mins',
      imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
      slug: 'switchboard-repair',
    },
    {
      id: 'svc-12',
      title: 'Ceiling Fan Installation & Repair',
      category: 'Electrical',
      price: 'From ₹349',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=400&q=80',
      slug: 'ceiling-fan-installation',
    },
    {
      id: 'svc-13',
      title: 'Tap & Shower Pipe Leak Repair',
      category: 'Plumbing',
      price: 'From ₹299',
      duration: '⏱ 45 mins',
      imageUrl: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?auto=format&fit=crop&w=400&q=80',
      slug: 'tap-leak-repair',
    },
    {
      id: 'svc-14',
      title: 'Drain Blockage & Sink Unclogging',
      category: 'Plumbing',
      price: 'From ₹499',
      duration: '⏱ 60 mins',
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=400&q=80',
      slug: 'drain-blockage-removal',
    },
    {
      id: 'svc-15',
      title: 'Furniture Assembly & Door Lock Repair',
      category: 'Carpentry',
      price: 'From ₹399',
      duration: '⏱ 60 mins',
      imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=80',
      slug: 'carpentry-service',
    },
    {
      id: 'svc-16',
      title: 'Pest & Anti-Termite Comprehensive Treatment',
      category: 'Pest Control',
      price: 'From ₹899',
      duration: '⏱ 90 mins',
      imageUrl: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=400&q=80',
      slug: 'pest-control-service',
    },
    {
      id: 'svc-17',
      title: 'Full Home Interior Wall Painting',
      category: 'Painting',
      price: 'From ₹2499',
      duration: '⏱ 180 mins',
      imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80',
      slug: 'painting-service',
    },
  ];

  const [servicesList, setServicesList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  React.useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/v1/services?limit=50').then((r) => (r.ok ? r.json() : null)),
      fetch('/api/v1/services/categories').then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([svcData, catData]) => {
        if (svcData?.data && Array.isArray(svcData.data) && svcData.data.length > 0) {
          const mapped = svcData.data.map((s: any) => ({
            id: s.id,
            title: s.name,
            category: s.category?.name || 'Appliances',
            price: `From ₹${Math.round(s.basePricePaise / 100)}`,
            duration: `⏱ ${s.estimatedDurationMinutes || 30} mins`,
            imageUrl: s.imageUrl || 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=400&q=80',
            slug: s.slug,
          }));
          setServicesList(mapped);
        } else {
          setServicesList(services);
        }

        if (catData?.data && Array.isArray(catData.data) && catData.data.length > 0) {
          const dynamicPills = ['All', ...catData.data.map((c: any) => c.name)];
          setFilterPills(dynamicPills);
        }
      })
      .catch(() => setServicesList(services))
      .finally(() => setIsLoading(false));
  }, []);

  const activeServices = servicesList.length > 0 ? servicesList : services;

  const isMatchCategory = (svcCategory: string, selectedCat: string, svcTitle: string = '') => {
    if (selectedCat === 'All') return true;
    const s = (svcCategory || '').toLowerCase();
    const t = (svcTitle || '').toLowerCase();
    const c = selectedCat.toLowerCase();

    if (s.includes(c) || c.includes(s) || t.includes(c)) return true;

    if (c === 'appliances') {
      return (
        s.includes('appliance') ||
        s.includes('washing') ||
        t.includes('washing') ||
        s.includes('refrigerator') ||
        s.includes('fridge') ||
        t.includes('refrigerator') ||
        t.includes('fridge') ||
        s.includes('microwave') ||
        t.includes('microwave') ||
        s.includes('purifier') ||
        t.includes('purifier') ||
        s.includes('geyser') ||
        t.includes('geyser') ||
        s.includes('chimney') ||
        t.includes('chimney') ||
        s.includes('tv') ||
        t.includes('tv')
      );
    }
    if (c === 'ac') {
      return s.includes('ac') || t.includes('ac') || s.includes('air conditioner') || t.includes('air conditioner');
    }
    if (c === 'cleaning') {
      return s.includes('clean') || t.includes('clean') || s.includes('sofa') || t.includes('sofa') || s.includes('bathroom') || t.includes('bathroom');
    }
    if (c === 'electrical') {
      return s.includes('electr') || t.includes('electr') || s.includes('wiring') || t.includes('wiring') || s.includes('fan') || t.includes('fan');
    }
    if (c === 'plumbing') {
      return s.includes('plumb') || t.includes('plumb') || s.includes('pipe') || t.includes('pipe') || s.includes('tap') || t.includes('tap') || s.includes('drain');
    }
    return false;
  };

  const filtered = activeServices.filter((svc) => {
    const matchesCat = isMatchCategory(svc.category, activeCategory, svc.title);
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || svc.title.toLowerCase().includes(query) || svc.category.toLowerCase().includes(query);
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px' }}>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#EAF4EF',
          borderRadius: '12px',
          padding: '10px 14px',
          gap: '10px',
        }}
      >
        <Icons.Search size={18} color="#64748B" />
        <input
          type="text"
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            width: '100%',
            fontSize: '13px',
            color: '#0F172A',
          }}
        />
      </div>

      {/* Category Filter Pills (Horizontal Scroll) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {filterPills.map((pill) => {
          const isSelected = activeCategory === pill;
          return (
            <button
              key={pill}
              onClick={() => setActiveCategory(pill)}
              style={{
                padding: '7px 16px',
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
              {pill}
            </button>
          );
        })}
      </div>

      {/* Service Cards (Vertical Stack) */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '13px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '28px', height: '28px', border: '3px solid #E2E8F0', borderTopColor: '#16A34A', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          Loading services catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', fontSize: '13px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
          No services found matching your search.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map((svc) => (
            <div
              key={svc.id}
              onClick={() => onNavigate('service-detail', { slug: svc.slug, title: svc.title })}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '12px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
              cursor: 'pointer',
              gap: '14px',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {/* Thumbnail */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '12px',
                overflow: 'hidden',
                flexShrink: 0,
                backgroundColor: '#F1F5F9',
              }}
            >
              <img
                src={svc.imageUrl}
                alt={svc.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Info */}
            <div style={{ flex: 1 }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 6px 0' }}>
                {svc.title}
              </h4>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0E3E2F', marginBottom: '4px' }}>
                {svc.price}
              </div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '12px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#64748B',
                }}
              >
                {svc.duration}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('service-detail', { slug: svc.slug, title: svc.title, category: svc.category });
                }}
                style={{
                  backgroundColor: '#16A34A',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                  transition: 'all 0.15s ease',
                }}
              >
                Book
              </button>
              <Icons.ChevronRight size={18} color="#94A3B8" />
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};
