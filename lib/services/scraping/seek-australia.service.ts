import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { ConfigService } from '@nestjs/config';
import { dataCollectionService, AgencyData, RecruiterData } from '../data-collection';

interface SeekJobResult {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description: string;
  url: string;
  postedDate: string;
  contactEmail?: string;
  contactPhone?: string;
}

interface SeekCompanyProfile {
  name: string;
  description?: string;
  website?: string;
  size?: string;
  industry?: string;
  location?: string;
  logo?: string;
  benefits?: string[];
}

@Injectable()
export class SeekAustraliaService {
  private readonly logger = new Logger(SeekAustraliaService.name);
  private readonly baseUrl = 'https://www.seek.com.au';
  private readonly maxRetries = 3;
  private readonly requestDelay = 2000;

  constructor(private configService: ConfigService) {}

  async scrapeRecruitmentAgencies(): Promise<AgencyData[]> {
    this.logger.log('Starting comprehensive Seek Australia recruitment agency scraping');
    
    const agencies: AgencyData[] = [];
    
    try {
      // Phase 1: Search for recruitment agencies by location
      const locationQueries = await this.generateLocationQueries();
      
      for (const query of locationQueries) {
        this.logger.debug(`Scraping query: ${query.searchTerm} in ${query.location}`);
        
        const queryResults = await this.scrapeByQuery(query);
        agencies.push(...queryResults);
        
        // Respectful delay between queries
        await this.delay(this.requestDelay + Math.random() * 1000);
      }

      // Phase 2: Deduplicate and enrich agencies
      const uniqueAgencies = this.deduplicateAgencies(agencies);
      const enrichedAgencies = await this.enrichAgencies(uniqueAgencies);

      this.logger.log(`Seek Australia scraping completed: ${enrichedAgencies.length} unique agencies found`);
      return enrichedAgencies;

    } catch (error) {
      this.logger.error('Seek Australia scraping failed', error);
      throw error;
    }
  }

  private async generateLocationQueries(): Promise<Array<{searchTerm: string, location: string}>> {
    const searchTerms = [
      'recruitment consultant',
      'talent acquisition specialist',
      'executive search consultant',
      'recruitment manager',
      'headhunter',
      'talent specialist',
      'recruitment agency',
      'search consultant'
    ];

    const locations = [
      'Sydney NSW',
      'Melbourne VIC', 
      'Brisbane QLD',
      'Perth WA',
      'Adelaide SA',
      'Canberra ACT',
      'Gold Coast QLD',
      'Newcastle NSW',
      'Wollongong NSW',
      'Hobart TAS'
    ];

    const queries: Array<{searchTerm: string, location: string}> = [];
    
    for (const location of locations) {
      for (const searchTerm of searchTerms) {
        queries.push({ searchTerm, location });
      }
    }

    return queries;
  }

  private async scrapeByQuery(query: {searchTerm: string, location: string}): Promise<AgencyData[]> {
    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      await this.setupPageForScraping(page);

      // Navigate to search results
      const searchUrl = this.buildSearchUrl(query.searchTerm, query.location);
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for job results to load
      await page.waitForSelector('[data-testid="job-card"], .noJobsMsg', { timeout: 15000 });

      // Check if no results
      const noResults = await page.$('.noJobsMsg');
      if (noResults) {
        this.logger.debug(`No results found for ${query.searchTerm} in ${query.location}`);
        return [];
      }

      // Extract job data
      const jobResults = await this.extractJobResults(page);
      
      // Process multiple pages if available
      const allJobResults = await this.scrapeAllPages(page, jobResults);
      
      // Convert job results to agency data
      const agencies = await this.convertJobsToAgencies(allJobResults, query.location);
      
      return agencies;

    } catch (error) {
      this.logger.error(`Failed to scrape query ${query.searchTerm} in ${query.location}`, error);
      return [];
    } finally {
      await browser.close();
    }
  }

  private async launchBrowser(): Promise<Browser> {
    return await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      defaultViewport: {
        width: 1366,
        height: 768
      }
    });
  }

  private async setupPageForScraping(page: Page): Promise<void> {
    // Set realistic headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-AU,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Upgrade-Insecure-Requests': '1'
    });

    // Override navigator properties to avoid detection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-AU', 'en'],
      });

      // Override chrome property
      (window as any).chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // Override permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );
    });

    // Random mouse movements and scrolling to simulate human behavior
    await this.simulateHumanBehavior(page);
  }

  private async simulateHumanBehavior(page: Page): Promise<void> {
    // Random mouse movements
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        Math.random() * 1366,
        Math.random() * 768
      );
      await this.delay(100 + Math.random() * 200);
    }

    // Random page interactions
    await page.evaluate(() => {
      window.scrollTo(0, Math.random() * 300);
    });
    
    await this.delay(500 + Math.random() * 1000);
  }

  private buildSearchUrl(searchTerm: string, location: string): string {
    const params = new URLSearchParams({
      q: searchTerm,
      where: location,
      sortmode: 'ListedDate',
      page: '1'
    });
    
    return `${this.baseUrl}/jobs?${params.toString()}`;
  }

  private async extractJobResults(page: Page): Promise<SeekJobResult[]> {
    return await page.evaluate(() => {
      const jobCards = Array.from(document.querySelectorAll('[data-testid="job-card"]'));
      const results: SeekJobResult[] = [];

      jobCards.forEach(card => {
        try {
          const titleElement = card.querySelector('[data-testid="job-title"] a');
          const companyElement = card.querySelector('[data-testid="job-company"] a, [data-testid="job-company"] span');
          const locationElement = card.querySelector('[data-testid="job-location"] span');
          const salaryElement = card.querySelector('[data-testid="job-salary"]');
          const summaryElement = card.querySelector('[data-testid="job-summary"]');
          const linkElement = card.querySelector('[data-testid="job-title"] a');

          const title = titleElement?.textContent?.trim() || '';
          const company = companyElement?.textContent?.trim() || '';
          const location = locationElement?.textContent?.trim() || '';
          const salary = salaryElement?.textContent?.trim();
          const description = summaryElement?.textContent?.trim() || '';
          const url = linkElement?.getAttribute('href') || '';

          // Only include if it's recruitment-related
          const isRecruitmentJob = title.toLowerCase().includes('recruit') || 
                                 title.toLowerCase().includes('talent') ||
                                 title.toLowerCase().includes('headhunt') ||
                                 title.toLowerCase().includes('search') ||
                                 company.toLowerCase().includes('recruit') ||
                                 company.toLowerCase().includes('talent') ||
                                 company.toLowerCase().includes('search');

          if (isRecruitmentJob && title && company) {
            results.push({
              title,
              company,
              location,
              salary,
              description,
              url: url.startsWith('http') ? url : `https://www.seek.com.au${url}`,
              postedDate: new Date().toISOString() // Seek doesn't always show exact dates
            });
          }
        } catch (error) {
          console.warn('Error extracting job card data:', error);
        }
      });

      return results;
    });
  }

  private async scrapeAllPages(page: Page, initialResults: SeekJobResult[]): Promise<SeekJobResult[]> {
    let allResults = [...initialResults];
    let currentPage = 1;
    const maxPages = 10; // Limit to prevent infinite loops

    while (currentPage < maxPages) {
      try {
        // Check if next page button exists and is enabled
        const nextButton = await page.$('a[title="Go to next page"]:not([disabled])');
        if (!nextButton) {
          break;
        }

        // Click next page
        await nextButton.click();
        await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });
        await this.delay(2000 + Math.random() * 1000);

        // Extract results from new page
        const pageResults = await this.extractJobResults(page);
        if (pageResults.length === 0) {
          break;
        }

        allResults.push(...pageResults);
        currentPage++;

        this.logger.debug(`Scraped page ${currentPage}, total results: ${allResults.length}`);

      } catch (error) {
        this.logger.warn(`Failed to scrape page ${currentPage + 1}:`, error);
        break;
      }
    }

    return allResults;
  }

  private async convertJobsToAgencies(jobs: SeekJobResult[], searchLocation: string): Promise<AgencyData[]> {
    const agencyMap = new Map<string, AgencyData>();

    for (const job of jobs) {
      const agencyKey = job.company.toLowerCase().trim();
      
      if (!agencyMap.has(agencyKey)) {
        // Create new agency entry
        const agency: AgencyData = {
          name: job.company,
          website: undefined,
          description: undefined,
          location: {
            country: 'Australia',
            region: this.extractRegionFromLocation(job.location || searchLocation),
            city: this.extractCityFromLocation(job.location || searchLocation)
          },
          contacts: {
            emails: [],
            phones: [],
            socialProfiles: {},
            verified: false,
            confidence: 0.6 // Initial confidence for job board data
          },
          size: undefined,
          specializations: [],
          recruiters: []
        };

        agencyMap.set(agencyKey, agency);
      }

      // Add recruiter information if the job posting indicates a recruiter role
      const agency = agencyMap.get(agencyKey)!;
      if (this.isRecruiterRole(job.title)) {
        const recruiterData: RecruiterData = {
          firstName: '',
          lastName: '',
          title: job.title,
          email: job.contactEmail,
          phone: job.contactPhone,
          linkedin: undefined,
          specializations: {
            industries: this.extractIndustriesFromJob(job),
            functions: this.extractFunctionsFromJob(job),
            seniorityLevels: this.extractSeniorityFromJob(job)
          },
          location: {
            country: 'Australia',
            region: this.extractRegionFromLocation(job.location || searchLocation),
            city: this.extractCityFromLocation(job.location || searchLocation)
          }
        };

        agency.recruiters?.push(recruiterData);
      }

      // Enhance agency specializations based on job postings
      const jobSpecializations = this.extractSpecializationsFromJob(job);
      if (agency.specializations) {
        agency.specializations.push(...jobSpecializations);
        agency.specializations = [...new Set(agency.specializations)]; // Remove duplicates
      }
    }

    return Array.from(agencyMap.values());
  }

  private async enrichAgencies(agencies: AgencyData[]): Promise<AgencyData[]> {
    const enrichedAgencies: AgencyData[] = [];

    for (const agency of agencies) {
      try {
        this.logger.debug(`Enriching agency: ${agency.name}`);
        
        // Try to find company profile on Seek
        const companyProfile = await this.scrapeCompanyProfile(agency.name);
        
        // Enhance agency data with company profile
        const enrichedAgency: AgencyData = {
          ...agency,
          website: companyProfile?.website || agency.website,
          description: companyProfile?.description || agency.description,
          size: this.mapCompanySizeToEnum(companyProfile?.size),
          specializations: agency.specializations || []
        };

        // Try to discover additional contact information
        enrichedAgency.contacts = await this.enhanceContactInformation(enrichedAgency);

        enrichedAgencies.push(enrichedAgency);
        
        // Rate limiting between enrichment requests
        await this.delay(1000 + Math.random() * 1000);

      } catch (error) {
        this.logger.warn(`Failed to enrich agency ${agency.name}:`, error);
        enrichedAgencies.push(agency);
      }
    }

    return enrichedAgencies;
  }

  private async scrapeCompanyProfile(companyName: string): Promise<SeekCompanyProfile | null> {
    const browser = await this.launchBrowser();
    
    try {
      const page = await browser.newPage();
      await this.setupPageForScraping(page);

      // Search for company profile
      const searchUrl = `${this.baseUrl}/companies/${this.slugify(companyName)}`;
      
      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });
      } catch (error) {
        // If direct URL fails, try searching
        const searchQuery = `${this.baseUrl}/companies?q=${encodeURIComponent(companyName)}`;
        await page.goto(searchQuery, { waitUntil: 'networkidle2', timeout: 15000 });
        
        // Click on first result if available
        const firstResult = await page.$('.company-card a');
        if (firstResult) {
          await firstResult.click();
          await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }
      }

      // Extract company information
      const profile = await page.evaluate(() => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim();
        };

        const getAttribute = (selector: string, attribute: string) => {
          const element = document.querySelector(selector);
          return element?.getAttribute(attribute);
        };

        return {
          name: getTextContent('h1, .company-name'),
          description: getTextContent('.company-description, [data-testid="company-description"]'),
          website: getAttribute('.company-website a, [data-testid="company-website"] a', 'href'),
          size: getTextContent('.company-size, [data-testid="company-size"]'),
          industry: getTextContent('.company-industry, [data-testid="company-industry"]'),
          location: getTextContent('.company-location, [data-testid="company-location"]'),
          logo: getAttribute('.company-logo img, [data-testid="company-logo"] img', 'src')
        };
      });

      return profile.name ? profile : null;

    } catch (error) {
      this.logger.debug(`Could not scrape profile for ${companyName}:`, error);
      return null;
    } finally {
      await browser.close();
    }
  }

  private async enhanceContactInformation(agency: AgencyData): Promise<any> {
    // Use the existing contact discovery service
    if (agency.website) {
      return await dataCollectionService.discoverContacts(agency);
    }
    
    return agency.contacts;
  }

  // Utility methods
  private deduplicateAgencies(agencies: AgencyData[]): AgencyData[] {
    const seen = new Set<string>();
    return agencies.filter(agency => {
      const key = `${agency.name.toLowerCase()}-${agency.location.city?.toLowerCase()}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private extractRegionFromLocation(location: string): string {
    const stateMap: {[key: string]: string} = {
      'NSW': 'New South Wales',
      'VIC': 'Victoria', 
      'QLD': 'Queensland',
      'WA': 'Western Australia',
      'SA': 'South Australia',
      'TAS': 'Tasmania',
      'ACT': 'Australian Capital Territory',
      'NT': 'Northern Territory'
    };

    for (const [abbrev, fullName] of Object.entries(stateMap)) {
      if (location.toUpperCase().includes(abbrev)) {
        return fullName;
      }
    }

    return 'Unknown';
  }

  private extractCityFromLocation(location: string): string {
    const parts = location.split(',')[0].trim();
    return parts || 'Unknown';
  }

  private isRecruiterRole(title: string): boolean {
    const recruiterKeywords = [
      'recruiter', 'recruitment', 'talent acquisition', 'headhunter', 
      'search consultant', 'talent specialist', 'talent partner'
    ];
    
    return recruiterKeywords.some(keyword => 
      title.toLowerCase().includes(keyword)
    );
  }

  private extractIndustriesFromJob(job: SeekJobResult): string[] {
    const industries: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    const industryKeywords = {
      'Technology': ['tech', 'software', 'it', 'digital', 'cyber'],
      'Finance': ['finance', 'banking', 'investment', 'fintech'],
      'Healthcare': ['health', 'medical', 'pharma', 'clinical'],
      'Mining': ['mining', 'resources', 'oil', 'gas', 'energy'],
      'Construction': ['construction', 'building', 'civil', 'engineering'],
      'Manufacturing': ['manufacturing', 'production', 'industrial']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        industries.push(industry);
      }
    }

    return industries;
  }

  private extractFunctionsFromJob(job: SeekJobResult): string[] {
    const functions: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (text.includes('executive') || text.includes('c-suite')) {
      functions.push('Executive Search');
    }
    if (text.includes('software') || text.includes('developer')) {
      functions.push('Software Engineering');
    }
    if (text.includes('sales') || text.includes('business development')) {
      functions.push('Sales');
    }
    if (text.includes('marketing') || text.includes('digital marketing')) {
      functions.push('Marketing');
    }

    return functions;
  }

  private extractSeniorityFromJob(job: SeekJobResult): string[] {
    const levels: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    if (text.includes('senior') || text.includes('sr.')) {
      levels.push('Senior');
    }
    if (text.includes('junior') || text.includes('jr.')) {
      levels.push('Junior');
    }
    if (text.includes('principal') || text.includes('lead')) {
      levels.push('Principal');
    }
    if (text.includes('director') || text.includes('vp') || text.includes('head of')) {
      levels.push('Director');
    }
    if (text.includes('executive') || text.includes('c-suite') || text.includes('ceo')) {
      levels.push('Executive');
    }

    return levels;
  }

  private extractSpecializationsFromJob(job: SeekJobResult): string[] {
    const specializations: string[] = [];
    const text = `${job.title} ${job.description}`.toLowerCase();
    
    const keywords = [
      'recruitment', 'talent acquisition', 'executive search', 
      'headhunting', 'talent sourcing', 'candidate sourcing'
    ];

    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        specializations.push(keyword);
      }
    });

    return specializations;
  }

  private mapCompanySizeToEnum(sizeText?: string): string | undefined {
    if (!sizeText) return undefined;
    
    const text = sizeText.toLowerCase();
    
    if (text.includes('1-10') || text.includes('small')) return 'SMALL';
    if (text.includes('11-50') || text.includes('medium')) return 'MEDIUM';
    if (text.includes('51-200') || text.includes('large')) return 'LARGE';
    if (text.includes('200+') || text.includes('enterprise')) return 'ENTERPRISE';
    
    return undefined;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { SeekAustraliaService };