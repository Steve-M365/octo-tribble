'use client'

import { useState } from 'react'
import { Search, Users, Building, Globe, MapPin, Database, FileText } from 'lucide-react'
import SearchFilters from '@/components/SearchFilters'
import RecruiterList from '@/components/RecruiterList'
import AgencyList from '@/components/AgencyList'
import Navigation from '@/components/Navigation'
import DataCollectionDashboard from '@/components/DataCollectionDashboard'

export default function Home() {
  const [activeTab, setActiveTab] = useState('search')
  const [filters, setFilters] = useState({
    country: null,
    region: null,
    city: null,
    agencySize: '',
    agencyTier: '',
    recruiterLevel: '',
  })

  const tabs = [
    { id: 'search', label: 'Search', icon: Search },
    { id: 'recruiters', label: 'Recruiters', icon: Users },
    { id: 'agencies', label: 'Agencies', icon: Building },
    { id: 'analytics', label: 'Analytics', icon: Database },
    { id: 'export', label: 'Export', icon: FileText },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Recruiter Search Platform
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl">
            Find and manage professional recruiters from top recruitment agencies worldwide. 
            Access contact details, company panels, and build relationships with agencies 
            that work with large to medium enterprises.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Agencies</p>
                <p className="text-2xl font-bold text-gray-900">1,247</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Recruiters</p>
                <p className="text-2xl font-bold text-gray-900">8,932</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Globe className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Countries</p>
                <p className="text-2xl font-bold text-gray-900">45</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Cities</p>
                <p className="text-2xl font-bold text-gray-900">312</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <SearchFilters 
              filters={filters} 
              onFiltersChange={setFilters}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'search' && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Search Results</h2>
                  <p className="text-sm text-gray-600">
                    Use the filters to narrow down your search for recruiters and agencies
                  </p>
                </div>
                <div className="p-6">
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Start Your Search
                    </h3>
                    <p className="text-gray-600">
                      Select a country and region to begin searching for recruitment agencies
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'recruiters' && (
              <RecruiterList filters={filters} />
            )}
            
            {activeTab === 'agencies' && (
              <AgencyList filters={filters} />
            )}
            
            {activeTab === 'analytics' && (
              <DataCollectionDashboard />
            )}
            
            {activeTab === 'export' && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Export Data</h2>
                <p className="text-gray-600">
                  Export functionality coming soon...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}