// Copyright (c) The Tachiyomi Open Source Project
// SPDX-License-Identifier: MPL-2.0

import type { UseQueryOptions } from '@tanstack/vue-query'
import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import { GITHUB_EXTENSION_JSON } from '../../config/constants'

export type ReleaseType = 'stable' | 'preview'

export interface Extension {
  name: string
  pkg: string
  apk: string
  apkUrl?: string
  iconUrl?: string
  lang: string
  code: number
  version: string
  nsfw: number
  hasReadme?: number
  hasChangelog?: number
  sources: Source[]
}

export interface Source {
  name: string
  lang: string
  id: string
  baseUrl: string
  versionId: number
}

type UseExtensionsRepositoryQueryOptions<S = Extension[]> =
  UseQueryOptions<Extension[], Error, S>

export default function useExtensionsRepositoryQuery<S = Extension[]>(options: UseExtensionsRepositoryQueryOptions<S> = {}) {
  return useQuery<Extension[], Error, S>({
    queryKey: ['extensions'],
    queryFn: async () => {
      const { data } = await axios.get<any>(GITHUB_EXTENSION_JSON)

      if (Array.isArray(data)) {
        return data.map((item: any) => ({
          name: item.name,
          pkg: item.pkg,
          apk: item.apk,
          apkUrl: item.apkUrl,
          iconUrl: item.iconUrl,
          lang: item.lang,
          code: item.code,
          version: item.version,
          nsfw: item.nsfw ? 1 : 0,
          hasReadme: item.hasReadme,
          hasChangelog: item.hasChangelog,
          sources: (item.sources || []).map((s: any) => ({
            name: s.name,
            lang: s.lang || s.language,
            id: String(s.id),
            baseUrl: s.baseUrl || s.homeUrl,
            versionId: s.versionId || 1,
          })),
        }))
      }

      if (data && typeof data === 'object' && data.extensionList?.extensions) {
        const rawExtensions: any[] = data.extensionList.extensions
        return rawExtensions.map((item: any) => {
          const apkUrl = item.resources?.apkUrl || ''
          const apkName = apkUrl ? apkUrl.substring(apkUrl.lastIndexOf('/') + 1) : `${item.packageName}.apk`
          const lang = item.sources?.[0]?.language || item.packageName?.split('.')[4] || 'all'
          const isNsfw = item.contentWarning && item.contentWarning !== 'SAFE' && item.contentWarning !== 0 ? 1 : 0

          return {
            name: item.name,
            pkg: item.packageName,
            apk: apkName,
            apkUrl: apkUrl,
            iconUrl: item.resources?.iconUrl || '',
            lang: lang,
            code: item.versionCode || 0,
            version: item.versionName || '',
            nsfw: isNsfw,
            hasReadme: 0,
            hasChangelog: 0,
            sources: (item.sources || []).map((s: any) => ({
              name: s.name,
              lang: s.language || s.lang || lang,
              id: String(s.id),
              baseUrl: s.homeUrl || s.baseUrl || '',
              versionId: s.versionId || 1,
            })),
          }
        })
      }

      return []
    },
    initialData: () => [],
    refetchOnWindowFocus: false,
    ...options,
  })
}