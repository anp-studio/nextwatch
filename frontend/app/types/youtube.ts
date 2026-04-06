export type YouTubePlayerErrorEvent = {
  data: number
}

export type YouTubePlayerOptions = {
  videoId: string
  width: string
  height: string
  playerVars: {
    autoplay: number
    modestbranding: number
    rel: number
  }
  events: {
    onError: (event: YouTubePlayerErrorEvent) => void
  }
}

export type YouTubePlayerInstance = {
  destroy: () => void
}

export type YouTubePlayerConstructor = new (
  elementId: string,
  options: YouTubePlayerOptions
) => YouTubePlayerInstance

export type YouTubeWindow = Window & {
  YT?: {
    Player: YouTubePlayerConstructor
  }
  onYouTubeIframeAPIReady?: () => void
}
