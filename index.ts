import { AxiosError } from 'axios';
import orderBy from 'lodash.orderby';
import { Item, Playlist, PlaylistTracks } from './types';
import * as dotenv from 'dotenv';
import { deleteRequest, getRequest, postRequest } from './DataService';
dotenv.config({ path: __dirname + '/.env' });

// const client_id = process.env.SPOTIFY_API_ID; // Your client id
// const client_secret = process.env.SPOTIFY_CLIENT_SECRET; // Your secret
// const auth_token = Buffer.from(`${client_id}:${client_secret}`, 'utf-8').toString('base64');
// get token for auth flow: https://developer.spotify.com/console/post-playlist-tracks

const playlist_id = process.env.PLAYLIST_ID;
const baseURL = `https://api.spotify.com/v1`;

const search = async (artist: string, album: string) => {
  artist = encodeURIComponent(artist);
  album = encodeURIComponent(album);
  const url = `${baseURL}/search?type=artist,album&q=artist:${artist}+album:${album}`;

  const data = await getRequest(url);
  if (!data || !data.albums) {
    throw new Error(`Error getting albums data`);
  }

  const { items } = data.albums;
  if (!items.length) {
    throw new Error(`Album not found`);
  }

  if (items.length > 1) {
    throw new Error(`More than one album found!`);
  }

  const { id } = items[0];
  await getAlbumTracks(id);
  return id;
};

const getAlbumTracks = async (id: string): Promise<any | undefined> => {
  const url = `${baseURL}/albums/${id}/tracks`;
  const data = await getRequest(url);
  if (!data) {
    throw new Error(`Error getting tracks`);
  }
  const { items } = data;
  const tracks = items.map((item: { id: string }) => item.id);
  return tracks;
};

const getURL = (items: string[]) => {
  const uris = items
    .map((item) => {
      return `spotify:track:${item}`;
    })
    .join(',');
  return `${baseURL}/playlists/${playlist_id}/tracks?uris=${uris}`;
};

const addTracksToPlaylist = async (trackIDs: string[]) => {
  const url = getURL(trackIDs);
  const data = await postRequest(url);
  if (!data || !data.snapshot_id) {
    throw new Error(`Error adding items to playlist`);
  }
  console.log(`[Success] tracks added - ${data.snapshot_id}`);
};

const addAlbumToPlaylist = async (artist: string, album: string) => {
  const albumID = await search(artist, album);
  const tracks = await getAlbumTracks(albumID);

  await addTracksToPlaylist(tracks);

  // let uris = tracks.map((item: string) => {
  //   return `spotify:track:${item}`;
  // });

  // uris = uris.join(',');
  // const url = `${baseURL}/playlists/${playlist_id}/tracks?uris=${uris}`;

  // const data = await postRequest(url);
};

const deleteTracksFromPlaylist = async (trackIDs: string[]) => {
  const uris = trackIDs.map((item) => {
    return {
      uri: `spotify:track:${item}`,
    };
  });
  const url = `${baseURL}/playlists/${playlist_id}/tracks`;
  const { snapshot_id } = await deleteRequest(url, { tracks: uris });
  console.log(`[Success] tracks deleted - ${snapshot_id}`);
};

const getPlaylistTracks = async () => {
  const url = `${baseURL}/playlists/${playlist_id}`;
  const playlistTracks: Playlist = await getRequest(url);
  return playlistTracks;
};

const getOrderedPlaylistTracks = (playlist: Playlist): PlaylistTracks[] => {
  const { tracks } = playlist;
  const { items } = tracks;

  const playlistTracks = items.map((item: Item) => {
    const { track } = item;
    const { id, album, disc_number, track_number } = track;
    let { release_date, release_date_precision, name } = album;
    if (release_date_precision === 'year') {
      release_date = `${release_date}-01-01`;
    }
    return {
      id: id,
      album: name,
      release_date: new Date(`${release_date}T00:00:00-08:00`),
      disc_number: disc_number,
      track_number: track_number,
    };
  });

  const orderedPlaylistTracks = orderBy(
    playlistTracks,
    ['release_date', 'album', 'disc_number', 'track_number'],
    ['asc', 'asc', 'asc', 'asc']
  );
  return orderedPlaylistTracks;
};

const orderPlaylistTracks = async () => {
  const playlistTracks = await getPlaylistTracks();
  const orderedPlaylistTracks = getOrderedPlaylistTracks(playlistTracks);
  const trackIDs = orderedPlaylistTracks.map((item) => item.id);
  await deleteTracksFromPlaylist(trackIDs);
  await addTracksToPlaylist(trackIDs);
};

(async () => {
  try {
    // re-order a playlist based on album release date
    // await orderPlaylistTracks();

    // add an album to a playlist based on some search term(s)
    const searchTerms = `Artist: Album`.split(':');
    await addAlbumToPlaylist(searchTerms[0], searchTerms[1]);
  } catch (error) {
    if (error instanceof Error) {
      const { response } = error as AxiosError;
      if (!response) {
        console.error(error.message);
        return;
      }
      console.error(`${response.status} ${response.data.error.message}`);
    }
  }
})();
