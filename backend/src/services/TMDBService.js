const https = require('https');
const http = require('http');

// Free TMDB API read token — see themoviedb.org/settings/api for your own
const TMDB_API_KEY = process.env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_BASE = 'api.themoviedb.org';

class TMDBService {
  /**
   * Fetch metadata for a movie from TMDB by title + year.
   * Returns { budget, runtime, genres, overview, poster_path, tmdb_id }
   */
  async enrich(title, year) {
    try {
      const searchResult = await this._searchMovie(title, year);
      if (!searchResult) return this._fallback();

      const details = await this._getDetails(searchResult.id);
      if (!details) return this._fallback();

      const mainGenre = details.genres?.[0]?.name || 'Unknown';
      const company = details.production_companies?.[0]?.name || 'Other';
      const releaseMonth = details.release_date ? parseInt(details.release_date.split('-')[1], 10) : 6;
      const posterUrl = details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : null;

      return {
        tmdb_id:       details.id,
        budget:        details.budget       || 0,
        runtime:       details.runtime      || 90,
        popularity:    details.popularity   || 10,
        genre:         mainGenre,
        company:       company,
        release_month: releaseMonth,
        overview:      details.overview     || '',
        poster_url:    posterUrl,
        found:         true,
      };
    } catch (err) {
      console.warn(`[TMDBService] Enrichment failed for "${title}": ${err.message}`);
      return this._fallback();
    }
  }

  _fallback() {
    return {
      budget: 0, runtime: 90, popularity: 10,
      genre: 'Unknown', company: 'Other', release_month: 6,
      overview: '', poster_url: null, found: false
    };
  }

  _fetch(path) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: TMDB_BASE,
        path,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${TMDB_API_KEY}`,
          'Content-Type': 'application/json',
        },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error('Invalid JSON')); }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  async _searchMovie(title, year) {
    const q = encodeURIComponent(title);
    const yearParam = year ? `&year=${year}` : '';
    const data = await this._fetch(`/3/search/movie?query=${q}${yearParam}&language=en-US&page=1`);
    if (data.results && data.results.length > 0) return data.results[0];
    return null;
  }

  async _getDetails(movieId) {
    return this._fetch(`/3/movie/${movieId}?language=en-US`);
  }
}

module.exports = new TMDBService();
