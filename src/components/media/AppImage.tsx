import { Image as ExpoImage, ImageProps } from 'expo-image';
import React from 'react';

/**
 * Remote images with a blurred placeholder and a fade-in.
 *
 * Plain RN <Image> pops from a blank box to the photo, which is very visible on
 * slow campus wifi. expo-image gives us a placeholder, a crossfade, and disk
 * caching so a revisited screen paints instantly.
 */

// Neutral grey blur — stands in for any photo without implying a colour.
const PLACEHOLDER_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export function AppImage({
  contentFit = 'cover',
  transition = 220,
  placeholder = { blurhash: PLACEHOLDER_BLURHASH },
  cachePolicy = 'memory-disk',
  ...rest
}: ImageProps) {
  return (
    <ExpoImage
      contentFit={contentFit}
      transition={transition}
      placeholder={placeholder}
      cachePolicy={cachePolicy}
      {...rest}
    />
  );
}
