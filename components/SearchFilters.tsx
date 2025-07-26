'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, Filter, X } from 'lucide-react'
import { Country, State, City } from 'country-state-city'

interface SearchFiltersProps {
  filters: {
    country: any
    region: any
    city: any
    agencySize: string
    agencyTier: string
    recruiterLevel: string
  }
  onFiltersChange: (filters: any) => void
}

export default function SearchFilters({ filters, onFiltersChange }: SearchFiltersProps) {
  const [countries, setCountries] = useState<any[]>([])
  const [regions, setRegions] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    // Load countries
    const countryList = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      ...country
    }))
    setCountries(countryList)
  }, [])

  useEffect(() => {
    if (filters.country) {
      const stateList = State.getStatesOfCountry(filters.country.value).map(state => ({
        value: state.isoCode,
        label: state.name,
        ...state
      }))
      setRegions(stateList)
    } else {
      setRegions([])
    }
  }, [filters.country])

  useEffect(() => {
    if (filters.region && filters.country) {
      const cityList = City.getCitiesOfState(filters.country.value, filters.region.value).map(city => ({
        value: city.name,
        label: city.name,
        ...city
      }))
      setCities(cityList)
    } else {
      setCities([])
    }
  }, [filters.region, filters.country])

  const handleCountryChange = (country: any) => {
    onFiltersChange({
      ...filters,
      country,
      region: null,
      city: null
    })
  }

  const handleRegionChange = (region: any) => {
    onFiltersChange({
      ...filters,
      region,
      city: null
    })
  }

  const handleCityChange = (city: any) => {
    onFiltersChange({
      ...filters,
      city
    })
  }

  const clearFilters = () => {
    onFiltersChange({
      country: null,
      region: null,
      city: null,
      agencySize: '',
      agencyTier: '',
      recruiterLevel: '',
    })
  }

  const agencySizes = [
    { value: '', label: 'All Sizes' },
    { value: 'BOUTIQUE', label: 'Boutique (1-10)' },
    { value: 'SMALL', label: 'Small (11-50)' },
    { value: 'MEDIUM', label: 'Medium (51-200)' },
    { value: 'LARGE', label: 'Large (201-1000)' },
    { value: 'ENTERPRISE', label: 'Enterprise (1000+)' },
  ]

  const agencyTiers = [
    { value: '', label: 'All Tiers' },
    { value: 'LOCAL', label: 'Local' },
    { value: 'REGIONAL', label: 'Regional' },
    { value: 'NATIONAL', label: 'National' },
    { value: 'INTERNATIONAL', label: 'International' },
    { value: 'GLOBAL', label: 'Global' },
  ]

  const recruiterLevels = [
    { value: '', label: 'All Levels' },
    { value: 'INTERN', label: 'Intern' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'SENIOR', label: 'Senior' },
    { value: 'PRINCIPAL', label: 'Principal' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'PARTNER', label: 'Partner' },
  ]

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center space-x-1"
        >
          <X className="h-4 w-4" />
          <span>Clear</span>
        </button>
      </div>

      <div className="space-y-6">
        {/* Location Filters */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">Location</h4>
          
          {/* Country */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            <select
              value={filters.country?.value || ''}
              onChange={(e) => {
                const country = countries.find(c => c.value === e.target.value)
                handleCountryChange(country || null)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Country</option>
              {countries.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>

          {/* Region */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Region/State</label>
            <select
              value={filters.region?.value || ''}
              onChange={(e) => {
                const region = regions.find(r => r.value === e.target.value)
                handleRegionChange(region || null)
              }}
              disabled={!filters.country}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select Region</option>
              {regions.map((region) => (
                <option key={region.value} value={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </div>

          {/* City */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            <select
              value={filters.city?.value || ''}
              onChange={(e) => {
                const city = cities.find(c => c.value === e.target.value)
                handleCityChange(city || null)
              }}
              disabled={!filters.region}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Select City</option>
              {cities.map((city) => (
                <option key={city.value} value={city.value}>
                  {city.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full p-3 text-left text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <span>Advanced Filters</span>
            <ChevronDown 
              className={`h-4 w-4 transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`} 
            />
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Agency Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agency Size</label>
              <select
                value={filters.agencySize}
                onChange={(e) => onFiltersChange({ ...filters, agencySize: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {agencySizes.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Agency Tier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Agency Tier</label>
              <select
                value={filters.agencyTier}
                onChange={(e) => onFiltersChange({ ...filters, agencyTier: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {agencyTiers.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recruiter Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recruiter Level</label>
              <select
                value={filters.recruiterLevel}
                onChange={(e) => onFiltersChange({ ...filters, recruiterLevel: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {recruiterLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {(filters.country || filters.agencySize || filters.agencyTier || filters.recruiterLevel) && (
          <div className="pt-4 border-t border-gray-200">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h5>
            <div className="flex flex-wrap gap-2">
              {filters.country && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {filters.country.label}
                </span>
              )}
              {filters.region && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {filters.region.label}
                </span>
              )}
              {filters.city && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {filters.city.label}
                </span>
              )}
              {filters.agencySize && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  {agencySizes.find(s => s.value === filters.agencySize)?.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}