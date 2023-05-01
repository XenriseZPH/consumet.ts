import axios from 'axios';
import { CheerioAPI, load } from 'cheerio';

import {
  AnimeParser,
  ISearch,
  IAnimeInfo,
  MediaStatus,
  IAnimeResult,
  ISource,
  IAnimeEpisode,
  IEpisodeServer,
  MediaFormat,
  FuzzyDate,
} from '../../models';

let cloudscraper: any;

/**
 * @attention Cloudflare bypass is *REQUIRED*.
 */
class KickAssAnime extends AnimeParser {
  override readonly name = 'KickAssAnime';
  protected override baseUrl = 'https://kaas.am';
  protected override logo =
    'https://user-images.githubusercontent.com/65111632/95666535-4f6dba80-0ba6-11eb-8583-e3a2074590e9.png';
  protected override classPath = 'ANIME.KickAssAnime';

  constructor() {
    try {
      cloudscraper = require('cloudscraper');
    } catch (err: any) {
      if (err.message.includes("Cannot find module 'request'")) {
        throw new Error(
          'Request is not installed. Please install it by running "npm i request" or "yarn add request"'
        );
      } else if (err.message.includes("Cannot find module 'cloudscraper'")) {
        throw new Error(
          'Cloudscraper is not installed. Please install it by running "npm i cloudscraper" or "yarn add cloudscraper"'
        );
      } else {
        throw new Error((err as Error).message);
      }
    }

    super();
  }

  /**
   * @param query Search query
   */
  override search = async (query: string, page: number = 1): Promise<ISearch<IAnimeResult>> => {
    try {
      const options = {
        method: 'POST',
        url: `${this.baseUrl}/api/fsearch`,
        json: { query: query, page: page },
        headers: {
          'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36',
          'Cache-Control': 'private',
          Accept:
            'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5',
        },
        cloudflareTimeout: 5000,
        cloudflareMaxTimeout: 30000,
        followAllRedirects: true,
        challengesToSolve: 3,
        decodeEmails: false,
        gzip: true,
      };

      const data = await cloudscraper(options).then((response: any) => response);

      const searchResult: ISearch<IAnimeResult> = {
        currentPage: page,
        hasNextPage: data.maxPage > page,
        totalPages: data.maxPage || 0,
        results: [],
      };

      searchResult.results = data.result.map((item: any) => {
        return {
          id: item.slug,
          title: item.title,
          url: `${this.baseUrl}/api${item.watch_uri}`,
          image: `${this.baseUrl}/image/poster/${item.poster.hq}.webp`,
          releaseDate: item.year,
        };
      });
      return searchResult;
    } catch (err) {
      throw new Error((err as Error).message);
    }
  };

  /**
   * @param id Anime id
   */
  override fetchAnimeInfo = async (id: string): Promise<IAnimeInfo> => {
    const options = {
      method: 'GET',
      url: `${this.baseUrl}/api/show/${id}`,
      headers: {
        'User-Agent': 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36',
        'Cache-Control': 'private',
        Accept: 'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5',
      },
      cloudflareTimeout: 5000,
      cloudflareMaxTimeout: 30000,
      followAllRedirects: true,
      challengesToSolve: 3,
      decodeEmails: false,
      gzip: true,
    };

    try {
      const animeInfo: IAnimeInfo = {
        id: id,
        title: '',
        url: `${this.baseUrl}/api/show/${id}`,
        genres: [],
        totalEpisodes: 0,
      };

      const rawData = await cloudscraper(options).then((response: any) => response);
      const data = JSON.parse(rawData);
      animeInfo.totalEpisodes = data?.episode_count ?? 'N/A';
      animeInfo.title = data?.title ?? 'N/A';
      animeInfo.image = data?.poster?.hq ? `${this.baseUrl}/image/poster/${data.poster.hq}.webp` : 'N/A';
      animeInfo.cover = data?.banner?.hq ? `${this.baseUrl}/image/banner/${data.banner.hq}.webp` : 'N/A';
      animeInfo.releaseDate =
        new Date(data?.start_date)?.toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) ?? 'N/A';
      animeInfo.startDate = this.parseDate(data?.start_date) ?? 'N/A';
      animeInfo.endDate = this.parseDate(data?.end_date) ?? 'N/A';
      animeInfo.description = data?.synopsis ?? 'N/A';
      animeInfo.type = (data?.type?.toUpperCase() as MediaFormat) ?? MediaFormat.TV;
      animeInfo.status =
        (() => {
          switch (data?.status) {
            case 'finished_airing':
              return MediaStatus.COMPLETED;
            case 'currently_airing':
              return MediaStatus.ONGOING;
            default:
              return MediaStatus.UNKNOWN;
          }
        })() ?? MediaStatus.UNKNOWN;
      animeInfo.genres = data?.genres ?? [];
      animeInfo.season = data?.season?.toUpperCase() ?? 'N/A';
      animeInfo.synonyms = [data?.title_en, data?.title_original]
        .filter(title => title != null)
        .map(title => title);

      return animeInfo;
    } catch (err) {
      throw new Error(`failed to fetch anime info: ${err}`);
    }
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeSources = async (episodeId: string): Promise<ISource> => {
    throw new Error('Method not implemented.');
  };

  /**
   *
   * @param episodeId Episode id
   */
  override fetchEpisodeServers = (episodeId: string): Promise<IEpisodeServer[]> => {
    throw new Error('Method not implemented.');
  };

  private parseDate(dateStr: string): FuzzyDate {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return { year, month, day };
  }
}

export default KickAssAnime;
