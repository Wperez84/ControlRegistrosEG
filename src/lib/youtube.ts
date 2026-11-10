import youtubeConfig from '../../youtube-config.json';

export interface YoutubeStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export function youtubeConfigurado(): boolean {
  return Boolean(youtubeConfig.apiKey);
}

export async function fetchYoutubeStats(videoIds: string[]): Promise<Record<string, YoutubeStats>> {
  const apiKey = youtubeConfig.apiKey;
  if (!apiKey) throw new Error('Falta configurar la API key de YouTube (youtube-config.json).');

  const result: Record<string, YoutubeStats> = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${batch.join(',')}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Error de YouTube API (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    for (const item of data.items ?? []) {
      result[item.id] = {
        viewCount: Number(item.statistics?.viewCount ?? 0),
        likeCount: Number(item.statistics?.likeCount ?? 0),
        commentCount: Number(item.statistics?.commentCount ?? 0),
      };
    }
  }
  return result;
}
