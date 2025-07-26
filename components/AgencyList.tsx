'use client'

import { useState, useEffect } from 'react'
import { Building, MapPin, Users, ExternalLink, Phone, Mail, Globe, Star, CheckCircle } from 'lucide-react'

interface Agency {
  id: string
  name: string
  website?: string
  description?: string
  size: string
  tier: string
  location: {
    country: string
    region?: string
    city?: string
  }
  verified: boolean
  recruiterCount: number
  panelCompanies: string[]
  contactInfo: {
    email?: string
    phone?: string
    linkedin?: string
  }
  lastUpdated: string
}

interface AgencyListProps {
  filters: any
}

export default function AgencyList({ filters }: AgencyListProps) {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)

  // Sample data - replace with API call
  const sampleAgencies: Agency[] = [
    {
      id: '1',
      name: 'TechRecruit Global',
      website: 'https://techrecruit.com',
      description: 'Leading technology recruitment agency specializing in Fortune 500 companies',
      size: 'LARGE',
      tier: 'INTERNATIONAL',
      location: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco'
      },
      verified: true,
      recruiterCount: 45,
      panelCompanies: ['Google', 'Microsoft', 'Apple', 'Meta', 'Amazon'],
      contactInfo: {
        email: 'contact@techrecruit.com',
        phone: '+1-555-0123',
        linkedin: 'https://linkedin.com/company/techrecruit'
      },
      lastUpdated: '2024-01-15'
    },
    {
      id: '2',
      name: 'Executive Search Partners',
      website: 'https://execsearch.com',
      description: 'Premium executive search firm for C-level positions',
      size: 'MEDIUM',
      tier: 'NATIONAL',
      location: {
        country: 'United Kingdom',
        region: 'England',
        city: 'London'
      },
      verified: true,
      recruiterCount: 28,
      panelCompanies: ['HSBC', 'Barclays', 'BP', 'Vodafone', 'Unilever'],
      contactInfo: {
        email: 'info@execsearch.com',
        phone: '+44-20-7123-4567'
      },
      lastUpdated: '2024-01-12'
    },
    {
      id: '3',
      name: 'Finance Talent Hub',
      description: 'Specialized financial services recruitment for investment banks and hedge funds',
      size: 'MEDIUM',
      tier: 'REGIONAL',
      location: {
        country: 'United States',
        region: 'New York',
        city: 'New York City'
      },
      verified: false,
      recruiterCount: 22,
      panelCompanies: ['Goldman Sachs', 'JP Morgan', 'Morgan Stanley', 'BlackRock'],
      contactInfo: {
        email: 'contact@financetalhub.com',
        phone: '+1-212-555-0187'
      },
      lastUpdated: '2024-01-10'
    }
  ]

  useEffect(() => {
    setLoading(true)
    // Simulate API call with filtering
    setTimeout(() => {
      let filteredAgencies = sampleAgencies

      if (filters.country) {
        filteredAgencies = filteredAgencies.filter(agency => 
          agency.location.country === filters.country.label
        )
      }

      if (filters.region) {
        filteredAgencies = filteredAgencies.filter(agency => 
          agency.location.region === filters.region.label
        )
      }

      if (filters.city) {
        filteredAgencies = filteredAgencies.filter(agency => 
          agency.location.city === filters.city.label
        )
      }

      if (filters.agencySize) {
        filteredAgencies = filteredAgencies.filter(agency => 
          agency.size === filters.agencySize
        )
      }

      if (filters.agencyTier) {
        filteredAgencies = filteredAgencies.filter(agency => 
          agency.tier === filters.agencyTier
        )
      }

      setAgencies(filteredAgencies)
      setLoading(false)
    }, 500)
  }, [filters])

  const getSizeLabel = (size: string) => {
    const sizeMap: { [key: string]: string } = {
      'BOUTIQUE': 'Boutique (1-10)',
      'SMALL': 'Small (11-50)',
      'MEDIUM': 'Medium (51-200)',
      'LARGE': 'Large (201-1000)',
      'ENTERPRISE': 'Enterprise (1000+)'
    }
    return sizeMap[size] || size
  }

  const getTierBadgeColor = (tier: string) => {
    const colorMap: { [key: string]: string } = {
      'LOCAL': 'bg-gray-100 text-gray-800',
      'REGIONAL': 'bg-blue-100 text-blue-800',
      'NATIONAL': 'bg-green-100 text-green-800',
      'INTERNATIONAL': 'bg-purple-100 text-purple-800',
      'GLOBAL': 'bg-red-100 text-red-800'
    }
    return colorMap[tier] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Recruitment Agencies</h2>
            <p className="text-sm text-gray-600">
              Found {agencies.length} agencies matching your criteria
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Sort by relevance</option>
              <option>Sort by name</option>
              <option>Sort by size</option>
              <option>Sort by verification</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {agencies.length === 0 ? (
          <div className="text-center py-12">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agencies found</h3>
            <p className="text-gray-600">
              Try adjusting your filters to see more results
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {agencies.map((agency) => (
              <div key={agency.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{agency.name}</h3>
                      {agency.verified && (
                        <div className="flex items-center space-x-1">
                          <CheckCircle className="h-5 w-5 text-green-500" />
                          <span className="text-sm text-green-600 font-medium">Verified</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {agency.location.city && `${agency.location.city}, `}
                          {agency.location.region && `${agency.location.region}, `}
                          {agency.location.country}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{agency.recruiterCount} recruiters</span>
                      </div>
                    </div>

                    {agency.description && (
                      <p className="text-gray-700 mb-4">{agency.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTierBadgeColor(agency.tier)}`}>
                        {agency.tier}
                      </span>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getSizeLabel(agency.size)}
                      </span>
                    </div>

                    {agency.panelCompanies.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-2">Company Panels:</h4>
                        <div className="flex flex-wrap gap-1">
                          {agency.panelCompanies.slice(0, 5).map((company, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700"
                            >
                              {company}
                            </span>
                          ))}
                          {agency.panelCompanies.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-50 text-gray-600">
                              +{agency.panelCompanies.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    {agency.contactInfo.email && (
                      <a
                        href={`mailto:${agency.contactInfo.email}`}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                      >
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </a>
                    )}
                    {agency.contactInfo.phone && (
                      <a
                        href={`tel:${agency.contactInfo.phone}`}
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                      >
                        <Phone className="h-4 w-4" />
                        <span>Phone</span>
                      </a>
                    )}
                    {agency.website && (
                      <a
                        href={agency.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                      >
                        <Globe className="h-4 w-4" />
                        <span>Website</span>
                      </a>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                      View Recruiters
                    </button>
                    <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                      Contact Agency
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}