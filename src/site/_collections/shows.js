/*
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const CacheAsset = require('@11ty/eleventy-cache-assets');
const fs = require('fs');
const yaml = require('js-yaml');
const path = require('path');

/** @type ShowsData */
const showsData = yaml.safeLoad(
  fs.readFileSync(
    path.join(__dirname, '..', '_data', 'i18n', 'paths', 'shows.yml'),
    'utf-8',
  ),
);

/**
 * Returns all authors with their posts.
 *
 * @return {Promise<Shows>}
 */
module.exports = async () => {
  /** @type Shows */
  const shows = {};
  const keys = Object.keys(showsData);

  for (const key of keys) {
    const showData = showsData[key];
    const href = `/shows/${key}/`;
    const url = `https://storage.googleapis.com/web-dev-uploads/youtube/${showData.playlistId}.json`;
    const elements = (
      await CacheAsset(url, {
        duration: '6h',
        type: 'json',
      }).catch((e) => {
        console.warn(e);
        return [];
      })
    ).map((v) => {
      v.date = new Date(v.date);
      v.data.date = new Date(v.data.date);
      v.url = `${href}${v.data.videoId}/`;
      return v;
    });
    if (elements.length === 0) {
      continue;
    }

    /** @type ShowsItem */
    const show = {
      ...showData,
      data: {
        alt: showData.title,
        date: elements[elements.length - 1].date,
        hero: elements[0].data.thumbnail,
        subhead: showData.description,
        title: showData.title,
      },
      elements,
      href,
      key,
      url: href,
    };

    // Limit posts for percy
    if (process.env.PERCY) {
      show.elements = show.elements.slice(-6);
    }

    // Set created on date and updated date
    if (show.elements.length > 0) {
      show.data.date = show.elements.slice(-1).pop().data.date;
      const updated = show.elements.slice(0, 1).pop().data.date;
      if (show.data.date !== updated) {
        show.data.updated = updated;
      }
    }

    if (show.elements.length > 0) {
      shows[key] = show;
    }
  }

  return shows;
};