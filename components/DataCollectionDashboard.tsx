'use client'

import { useState, useEffect } from 'react'
import { 
  Activity, Database, CheckCircle, AlertTriangle, Clock, 
  TrendingUp, Users, Building, Globe, Search, RefreshCw,
  BarChart3, PieChart, Target, Zap
} from 'lucide-react'

interface DataSource {
  name: string
  status: 'active' | 'idle' | 'error' | 'completed'
  progress: number
  recordsFound: number
  lastRun: string
  nextRun: string
  errorRate: number
  confidence: number
}

interface QualityMetrics {
  totalRecords: number
  verifiedContacts: number
  completenessScore: number
  freshnessScore: number
  duplicateRate: number
  responseRate: number
}

interface GeographicCoverage {
  country: string
  agencies: number
  recruiters: number
  coverage: number
  lastUpdated: string
}

export default function DataCollectionDashboard() {
  const [dataSources, setDataSources] = useState<DataSource[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics | null>(null)
  const [geographicCoverage, setGeographicCoverage] = useState<GeographicCoverage[]>([])
  const [isCollecting, setIsCollecting] = useState(false)
  const [selectedTimeframe, setSelectedTimeframe] = useState('24h')

  // Sample data sources
  const sampleDataSources: DataSource[] = [
    {
      name: 'LinkedIn Companies',
      status: 'active',
      progress: 78,
      recordsFound: 2847,
      lastRun: '2024-01-16 14:30',
      nextRun: '2024-01-16 18:30',
      errorRate: 2.1,
      confidence: 89
    },
    {
      name: 'RPO Directory',
      status: 'completed',
      progress: 100,
      recordsFound: 456,
      lastRun: '2024-01-16 12:00',
      nextRun: '2024-01-17 12:00',
      errorRate: 0.5,
      confidence: 95
    },
    {
      name: 'Indeed Job Boards',
      status: 'active',
      progress: 45,
      recordsFound: 1203,
      lastRun: '2024-01-16 15:00',
      nextRun: '2024-01-16 19:00',
      errorRate: 5.2,
      confidence: 73
    },
    {
      name: 'Google Places API',
      status: 'idle',
      progress: 0,
      recordsFound: 0,
      lastRun: '2024-01-16 10:00',
      nextRun: '2024-01-16 16:00',
      errorRate: 0,
      confidence: 85
    },
    {
      name: 'Hunter.io Email Discovery',
      status: 'error',
      progress: 23,
      recordsFound: 892,
      lastRun: '2024-01-16 13:45',
      nextRun: '2024-01-16 17:45',
      errorRate: 15.7,
      confidence: 62
    }
  ]

  const sampleQualityMetrics: QualityMetrics = {
    totalRecords: 15487,
    verifiedContacts: 12203,
    completenessScore: 87,
    freshnessScore: 92,
    duplicateRate: 3.2,
    responseRate: 68
  }

  const sampleGeographicCoverage: GeographicCoverage[] = [
    {
      country: 'United States',
      agencies: 4523,
      recruiters: 28491,
      coverage: 78,
      lastUpdated: '2024-01-16'
    },
    {
      country: 'United Kingdom',
      agencies: 1847,
      recruiters: 11203,
      coverage: 85,
      lastUpdated: '2024-01-16'
    },
    {
      country: 'Canada',
      agencies: 892,
      recruiters: 5647,
      coverage: 72,
      lastUpdated: '2024-01-15'
    },
    {
      country: 'Australia',
      agencies: 634,
      recruiters: 3829,
      coverage: 69,
      lastUpdated: '2024-01-15'
    },
    {
      country: 'Germany',
      agencies: 567,
      recruiters: 3241,
      coverage: 45,
      lastUpdated: '2024-01-14'
    }
  ]

  useEffect(() => {
    setDataSources(sampleDataSources)
    setQualityMetrics(sampleQualityMetrics)
    setGeographicCoverage(sampleGeographicCoverage)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'completed': return 'text-green-600 bg-green-100'
      case 'error': return 'text-red-600 bg-red-100'
      case 'idle': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Activity className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'error': return <AlertTriangle className="h-4 w-4" />
      case 'idle': return <Clock className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const startDataCollection = async () => {
    setIsCollecting(true)
    // Simulate data collection process
    setTimeout(() => {
      setIsCollecting(false)
    }, 3000)
  }

  const totalAgencies = geographicCoverage.reduce((sum, country) => sum + country.agencies, 0)
  const totalRecruiters = geographicCoverage.reduce((sum, country) => sum + country.recruiters, 0)
  const avgCoverage = geographicCoverage.reduce((sum, country) => sum + country.coverage, 0) / geographicCoverage.length

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Data Collection Dashboard</h2>
            <p className="text-gray-600">Real-time monitoring of recruitment data collection</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
            
            <button
              onClick={startDataCollection}
              disabled={isCollecting}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white ${
                isCollecting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isCollecting ? 'animate-spin' : ''}`} />
              {isCollecting ? 'Collecting...' : 'Start Collection'}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total Agencies</p>
                <p className="text-2xl font-bold">{totalAgencies.toLocaleString()}</p>
              </div>
              <Building className="h-8 w-8 text-blue-200" />
            </div>
            <div className="mt-2 text-blue-100 text-sm">
              +12% from last month
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Recruiters</p>
                <p className="text-2xl font-bold">{totalRecruiters.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-200" />
            </div>
            <div className="mt-2 text-green-100 text-sm">
              +8% from last month
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Avg Coverage</p>
                <p className="text-2xl font-bold">{avgCoverage.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-purple-200" />
            </div>
            <div className="mt-2 text-purple-100 text-sm">
              +3% from last month
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Quality Score</p>
                <p className="text-2xl font-bold">{qualityMetrics?.completenessScore}%</p>
              </div>
              <Zap className="h-8 w-8 text-orange-200" />
            </div>
            <div className="mt-2 text-orange-100 text-sm">
              +5% from last month
            </div>
          </div>
        </div>
      </div>

      {/* Data Sources Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Data Source Status</h3>
          <p className="text-sm text-gray-600">Real-time status of all data collection sources</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {dataSources.map((source, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${getStatusColor(source.status)}`}>
                      {getStatusIcon(source.status)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{source.name}</h4>
                      <p className="text-sm text-gray-600">
                        {source.recordsFound.toLocaleString()} records found
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {source.confidence}% confidence
                    </div>
                    <div className="text-xs text-gray-500">
                      {source.errorRate}% error rate
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{source.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        source.status === 'error' ? 'bg-red-500' :
                        source.status === 'completed' ? 'bg-green-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${source.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Last run: {source.lastRun}</span>
                  <span>Next run: {source.nextRun}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quality Metrics and Geographic Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Metrics */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Data Quality Metrics</h3>
            <p className="text-sm text-gray-600">Overall data quality and verification status</p>
          </div>
          <div className="p-6">
            {qualityMetrics && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Verified Contacts</span>
                  <span className="text-sm font-bold text-green-600">
                    {((qualityMetrics.verifiedContacts / qualityMetrics.totalRecords) * 100).toFixed(1)}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Completeness Score</span>
                  <span className="text-sm font-bold text-blue-600">{qualityMetrics.completenessScore}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Freshness Score</span>
                  <span className="text-sm font-bold text-purple-600">{qualityMetrics.freshnessScore}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Duplicate Rate</span>
                  <span className="text-sm font-bold text-orange-600">{qualityMetrics.duplicateRate}%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Response Rate</span>
                  <span className="text-sm font-bold text-teal-600">{qualityMetrics.responseRate}%</span>
                </div>

                {/* Quality Score Visualization */}
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">Overall Quality</span>
                    <span className="font-medium">{qualityMetrics.completenessScore}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="h-3 rounded-full bg-gradient-to-r from-green-400 to-green-500"
                      style={{ width: `${qualityMetrics.completenessScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Geographic Coverage */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Geographic Coverage</h3>
            <p className="text-sm text-gray-600">Market coverage by country</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {geographicCoverage.map((country, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-gray-900">{country.country}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">{country.coverage}%</span>
                  </div>
                  
                  <div className="pl-7">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>{country.agencies} agencies, {country.recruiters} recruiters</span>
                      <span>Updated {country.lastUpdated}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${country.coverage}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Collection Activity Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Collection Activity</h3>
          <p className="text-sm text-gray-600">Latest data collection events and updates</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              {
                time: '14:30',
                event: 'LinkedIn scraping completed',
                detail: '2,847 new agency records discovered',
                type: 'success'
              },
              {
                time: '13:45',
                event: 'Email verification failed',
                detail: 'Hunter.io API rate limit exceeded',
                type: 'error'
              },
              {
                time: '12:00',
                event: 'RPO Directory scan finished',
                detail: '456 agencies updated successfully',
                type: 'success'
              },
              {
                time: '10:00',
                event: 'Google Places API paused',
                detail: 'Scheduled maintenance window',
                type: 'warning'
              }
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-green-500' :
                  activity.type === 'error' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`}></div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{activity.event}</p>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-xs text-gray-600">{activity.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}