'use client'

import { useState, useEffect } from 'react'
import { User, MapPin, Building, Briefcase, Mail, Phone, Linkedin, Star, CheckCircle, Shield, Clock, ExternalLink } from 'lucide-react'

interface Specialization {
  industry: string[]
  functions: string[]
  seniorityLevel: string[]
  technologies?: string[]
}

interface ContactInfo {
  email?: string
  phone?: string
  linkedin?: string
  verified: boolean
  lastVerified?: string
  responseRate?: number
}

interface PlacementHistory {
  companyName: string
  role: string
  level: string
  year: number
}

interface Recruiter {
  id: string
  firstName: string
  lastName: string
  title: string
  agency: {
    id: string
    name: string
    tier: string
  }
  location: {
    country: string
    region?: string
    city?: string
  }
  specialization: Specialization
  contactInfo: ContactInfo
  verified: boolean
  active: boolean
  lastSeen?: string
  yearsExperience: number
  placementHistory: PlacementHistory[]
  successRate: number
  qualityScore: number
  languages?: string[]
  certifications?: string[]
}

interface RecruiterListProps {
  filters: any
}

export default function RecruiterList({ filters }: RecruiterListProps) {
  const [recruiters, setRecruiters] = useState<Recruiter[]>([])
  const [loading, setLoading] = useState(false)
  const [sortBy, setSortBy] = useState('relevance')
  const [viewMode, setViewMode] = useState('detailed') // detailed, compact, cards

  // Enhanced sample data with specializations
  const sampleRecruiters: Recruiter[] = [
    {
      id: '1',
      firstName: 'Sarah',
      lastName: 'Chen',
      title: 'Senior Technology Recruiter',
      agency: {
        id: '1',
        name: 'TechRecruit Global',
        tier: 'INTERNATIONAL'
      },
      location: {
        country: 'United States',
        region: 'California',
        city: 'San Francisco'
      },
      specialization: {
        industry: ['Technology', 'FinTech', 'AI/ML'],
        functions: ['Software Engineering', 'Product Management', 'Data Science'],
        seniorityLevel: ['Senior', 'Staff', 'Principal'],
        technologies: ['React', 'Python', 'Kubernetes', 'AWS', 'Machine Learning']
      },
      contactInfo: {
        email: 'sarah.chen@techrecruit.com',
        phone: '+1-415-555-0123',
        linkedin: 'https://linkedin.com/in/sarahchen-tech',
        verified: true,
        lastVerified: '2024-01-15',
        responseRate: 78
      },
      verified: true,
      active: true,
      lastSeen: '2024-01-16',
      yearsExperience: 8,
      placementHistory: [
        { companyName: 'Google', role: 'Senior Software Engineer', level: 'L6', year: 2024 },
        { companyName: 'Meta', role: 'Staff Engineer', level: 'E6', year: 2023 },
        { companyName: 'Stripe', role: 'Principal Engineer', level: 'L7', year: 2023 }
      ],
      successRate: 85,
      qualityScore: 92,
      languages: ['English', 'Mandarin'],
      certifications: ['Certified Talent Acquisition Professional']
    },
    {
      id: '2',
      firstName: 'Marcus',
      lastName: 'Williams',
      title: 'Executive Search Consultant',
      agency: {
        id: '2',
        name: 'Executive Search Partners',
        tier: 'NATIONAL'
      },
      location: {
        country: 'United Kingdom',
        region: 'England',
        city: 'London'
      },
      specialization: {
        industry: ['Financial Services', 'Investment Banking', 'Private Equity'],
        functions: ['Executive Search', 'C-Suite', 'Board Positions'],
        seniorityLevel: ['Director', 'VP', 'C-Suite']
      },
      contactInfo: {
        email: 'marcus.williams@execsearch.com',
        phone: '+44-20-7123-4567',
        linkedin: 'https://linkedin.com/in/marcuswilliams-exec',
        verified: true,
        lastVerified: '2024-01-12',
        responseRate: 91
      },
      verified: true,
      active: true,
      lastSeen: '2024-01-14',
      yearsExperience: 15,
      placementHistory: [
        { companyName: 'HSBC', role: 'Chief Technology Officer', level: 'C-Suite', year: 2024 },
        { companyName: 'Barclays', role: 'Managing Director', level: 'MD', year: 2023 }
      ],
      successRate: 92,
      qualityScore: 96,
      languages: ['English', 'French'],
      certifications: ['AESC Member', 'Executive Search Professional']
    },
    {
      id: '3',
      firstName: 'Emily',
      lastName: 'Rodriguez',
      title: 'Healthcare Recruitment Specialist',
      agency: {
        id: '3',
        name: 'MedTalent Solutions',
        tier: 'REGIONAL'
      },
      location: {
        country: 'United States',
        region: 'Texas',
        city: 'Houston'
      },
      specialization: {
        industry: ['Healthcare', 'Pharmaceuticals', 'Medical Devices'],
        functions: ['Clinical Research', 'Regulatory Affairs', 'Medical Affairs'],
        seniorityLevel: ['Mid-Level', 'Senior', 'Director']
      },
      contactInfo: {
        email: 'emily.r@medtalent.com',
        phone: '+1-713-555-0198',
        linkedin: 'https://linkedin.com/in/emilyrodriguez-med',
        verified: false,
        lastVerified: '2024-01-05',
        responseRate: 67
      },
      verified: false,
      active: true,
      lastSeen: '2024-01-13',
      yearsExperience: 6,
      placementHistory: [
        { companyName: 'Johnson & Johnson', role: 'Clinical Research Manager', level: 'Manager', year: 2023 },
        { companyName: 'Pfizer', role: 'Regulatory Affairs Specialist', level: 'Senior', year: 2023 }
      ],
      successRate: 73,
      qualityScore: 81,
      languages: ['English', 'Spanish'],
      certifications: ['Healthcare Recruitment Certified']
    }
  ]

  useEffect(() => {
    setLoading(true)
    // Simulate API call with enhanced filtering
    setTimeout(() => {
      let filteredRecruiters = sampleRecruiters

      if (filters.country) {
        filteredRecruiters = filteredRecruiters.filter(recruiter => 
          recruiter.location.country === filters.country.label
        )
      }

      if (filters.region) {
        filteredRecruiters = filteredRecruiters.filter(recruiter => 
          recruiter.location.region === filters.region.label
        )
      }

      if (filters.city) {
        filteredRecruiters = filteredRecruiters.filter(recruiter => 
          recruiter.location.city === filters.city.label
        )
      }

      if (filters.recruiterLevel) {
        filteredRecruiters = filteredRecruiters.filter(recruiter => 
          recruiter.specialization.seniorityLevel.includes(filters.recruiterLevel)
        )
      }

      // Sort recruiters
      switch (sortBy) {
        case 'quality':
          filteredRecruiters.sort((a, b) => b.qualityScore - a.qualityScore)
          break
        case 'experience':
          filteredRecruiters.sort((a, b) => b.yearsExperience - a.yearsExperience)
          break
        case 'success':
          filteredRecruiters.sort((a, b) => b.successRate - a.successRate)
          break
        case 'response':
          filteredRecruiters.sort((a, b) => (b.contactInfo.responseRate || 0) - (a.contactInfo.responseRate || 0))
          break
        default:
          // Keep original order for relevance
          break
      }

      setRecruiters(filteredRecruiters)
      setLoading(false)
    }, 600)
  }, [filters, sortBy])

  const getVerificationBadge = (verified: boolean, contactVerified: boolean) => {
    if (verified && contactVerified) {
      return (
        <div className="flex items-center space-x-1">
          <Shield className="h-4 w-4 text-green-500" />
          <span className="text-xs text-green-600 font-medium">Verified</span>
        </div>
      )
    } else if (verified) {
      return (
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4 text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">Profile Verified</span>
        </div>
      )
    }
    return null
  }

  const getQualityScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getResponseRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600'
    if (rate >= 60) return 'text-blue-600'
    if (rate >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Professional Recruiters</h2>
            <p className="text-sm text-gray-600">
              Found {recruiters.length} recruiters matching your criteria
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="relevance">Sort by relevance</option>
              <option value="quality">Sort by quality score</option>
              <option value="experience">Sort by experience</option>
              <option value="success">Sort by success rate</option>
              <option value="response">Sort by response rate</option>
            </select>
            
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('detailed')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  viewMode === 'detailed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Detailed
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-1 text-xs font-medium rounded-md ${
                  viewMode === 'compact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Compact
              </button>
            </div>
          </div>
        </div>

        {/* Specialization Filter Bar */}
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
            Technology
          </button>
          <button className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
            Finance
          </button>
          <button className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
            Healthcare
          </button>
          <button className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
            Executive Search
          </button>
          <button className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200">
            + More Filters
          </button>
        </div>
      </div>

      <div className="p-6">
        {recruiters.length === 0 ? (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recruiters found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or search in a different location
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {recruiters.map((recruiter) => (
              <div key={recruiter.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start space-x-4">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-gray-500" />
                  </div>

                  {/* Main Content */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-3 mb-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {recruiter.firstName} {recruiter.lastName}
                          </h3>
                          {getVerificationBadge(recruiter.verified, recruiter.contactInfo.verified)}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-1">{recruiter.title}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Building className="h-4 w-4" />
                            <span>{recruiter.agency.name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {recruiter.location.city && `${recruiter.location.city}, `}
                              {recruiter.location.country}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Briefcase className="h-4 w-4" />
                            <span>{recruiter.yearsExperience} years</span>
                          </div>
                        </div>
                      </div>

                      {/* Quality Metrics */}
                      <div className="flex items-center space-x-3">
                        <div className="text-center">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getQualityScoreColor(recruiter.qualityScore)}`}>
                            {recruiter.qualityScore}% Quality
                          </div>
                        </div>
                        
                        {recruiter.contactInfo.responseRate && (
                          <div className="text-center">
                            <div className={`text-xs font-medium ${getResponseRateColor(recruiter.contactInfo.responseRate)}`}>
                              {recruiter.contactInfo.responseRate}% Response
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Specializations */}
                    {viewMode === 'detailed' && (
                      <div className="mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Industries</h4>
                            <div className="flex flex-wrap gap-1">
                              {recruiter.specialization.industry.slice(0, 3).map((industry, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                                  {industry}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Functions</h4>
                            <div className="flex flex-wrap gap-1">
                              {recruiter.specialization.functions.slice(0, 2).map((func, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-50 text-green-700">
                                  {func}
                                </span>
                              ))}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-xs font-medium text-gray-700 mb-2">Seniority</h4>
                            <div className="flex flex-wrap gap-1">
                              {recruiter.specialization.seniorityLevel.slice(0, 2).map((level, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded text-xs bg-purple-50 text-purple-700">
                                  {level}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Recent Placements */}
                    {viewMode === 'detailed' && recruiter.placementHistory.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Placements</h4>
                        <div className="space-y-1">
                          {recruiter.placementHistory.slice(0, 2).map((placement, index) => (
                            <div key={index} className="text-xs text-gray-600">
                              <span className="font-medium">{placement.companyName}</span> - {placement.role} ({placement.year})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contact Information & Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-4">
                        {recruiter.contactInfo.email && (
                          <a
                            href={`mailto:${recruiter.contactInfo.email}`}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                          >
                            <Mail className="h-4 w-4" />
                            <span>Email</span>
                            {recruiter.contactInfo.verified && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </a>
                        )}
                        
                        {recruiter.contactInfo.phone && (
                          <a
                            href={`tel:${recruiter.contactInfo.phone}`}
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                          >
                            <Phone className="h-4 w-4" />
                            <span>Phone</span>
                          </a>
                        )}
                        
                        {recruiter.contactInfo.linkedin && (
                          <a
                            href={recruiter.contactInfo.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600"
                          >
                            <Linkedin className="h-4 w-4" />
                            <span>LinkedIn</span>
                          </a>
                        )}

                        {recruiter.lastSeen && (
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>Active {recruiter.lastSeen}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                          View Profile
                        </button>
                        <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                          Contact
                        </button>
                      </div>
                    </div>
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