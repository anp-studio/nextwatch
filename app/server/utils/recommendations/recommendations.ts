import type { H3Event } from 'h3'
import { askPlatformAi } from './ai-client'
import type { PlatformAiMessage } from './ai-client'
import {
  INITIAL_RECOMMENDATION_RETRY_COUNT,
  MAX_RECOMMENDATION_ROUNDS,
  TARGET_RECOMMENDATIONS,
} from './constants'
import { appendTmdbIds } from './movie-id-matching'
import {
  buildReplacementUserMessage,
  buildUserMessage,
  createRecommendationSystemPrompt,
  RECOMMENDATION_RESPONSE_SCHEMA,
  REPLACEMENT_RESPONSE_SCHEMA,
} from './prompts'
import {
  parseInitialRecommendationResponse,
  parseReplacementRecommendationResponse,
} from './response-parser'
import {
  createRecommendationValidationState,
  shouldAskForDeeperCuts,
  toBlockedExcludedRecommendations,
  validateRecommendationBatch,
} from './recommendation-validation'
import type {
  IndexedRecommendationWithId,
  InitialModelRecommendation,
  Recommendation,
  RecommendationWithId,
  ReplacementModelRecommendation,
  WatchedMovieRecord,
} from './types'

function toRecommendation(
  recommendation: InitialModelRecommendation | ReplacementModelRecommendation
): Recommendation {
  const title = recommendation.title.trim()

  return {
    name: title,
    originalName: title,
    year: recommendation.release_year,
  }
}

interface InitialRecommendationRequest {
  systemPrompt: string
  userMessage: string
  messages: PlatformAiMessage[]
}

function buildInitialRecommendationRequest(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  excludedMovies: RecommendationWithId[],
  candidateCount?: number
): InitialRecommendationRequest {
  const systemPrompt = createRecommendationSystemPrompt(candidateCount)
  const userMessage = buildUserMessage(watchedMovies, myListMovies, excludedMovies, candidateCount)

  return {
    systemPrompt,
    userMessage,
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ],
  }
}

async function requestInitialRecommendationRaw(
  request: InitialRecommendationRequest,
  userId?: string,
  event?: H3Event
): Promise<string> {
  return askPlatformAi({
    systemPrompt: request.systemPrompt,
    userMessage: request.userMessage,
    messages: [...request.messages],
    schema: RECOMMENDATION_RESPONSE_SCHEMA,
    schemaName: 'movie_recommendations',
    userId,
    event,
  })
}

async function fetchInitialRecommendations(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  excludedMovies: RecommendationWithId[],
  userId?: string,
  event?: H3Event
): Promise<{
  systemPrompt: string
  userMessage: string
  raw: string
  parsed: InitialModelRecommendation[]
}> {
  const initialRequest = buildInitialRecommendationRequest(
    watchedMovies,
    myListMovies,
    excludedMovies
  )
  const initialRaw = await requestInitialRecommendationRaw(initialRequest, userId, event)

  try {
    return {
      systemPrompt: initialRequest.systemPrompt,
      userMessage: initialRequest.userMessage,
      raw: initialRaw,
      parsed: parseInitialRecommendationResponse(initialRaw, userId, event),
    }
  } catch (error) {
    const retryRequest = buildInitialRecommendationRequest(
      watchedMovies,
      myListMovies,
      excludedMovies,
      INITIAL_RECOMMENDATION_RETRY_COUNT
    )
    const retryRaw = await requestInitialRecommendationRaw(retryRequest, userId, event)

    try {
      return {
        systemPrompt: retryRequest.systemPrompt,
        userMessage: retryRequest.userMessage,
        raw: retryRaw,
        parsed: parseInitialRecommendationResponse(retryRaw, userId, event),
      }
    } catch {
      throw error
    }
  }
}

function toIndexedRecommendation(
  recommendation: InitialModelRecommendation,
  resolvedRecommendation: RecommendationWithId
): IndexedRecommendationWithId {
  return {
    ...resolvedRecommendation,
    index: recommendation.index,
  }
}

function toIndexedReplacementRecommendation(
  recommendation: ReplacementModelRecommendation,
  resolvedRecommendation: RecommendationWithId
): IndexedRecommendationWithId {
  return {
    ...resolvedRecommendation,
    index: recommendation.replaced_index,
  }
}

function toIndexedRecommendations(
  modelRecommendations: InitialModelRecommendation[],
  resolvedRecommendations: RecommendationWithId[]
): IndexedRecommendationWithId[] {
  const recommendations: IndexedRecommendationWithId[] = []

  for (const [index, modelRecommendation] of modelRecommendations.entries()) {
    const resolvedRecommendation = resolvedRecommendations[index]

    if (!resolvedRecommendation) {
      continue
    }

    recommendations.push(toIndexedRecommendation(modelRecommendation, resolvedRecommendation))
  }

  return recommendations
}

function toIndexedReplacementRecommendations(
  modelRecommendations: ReplacementModelRecommendation[],
  resolvedRecommendations: RecommendationWithId[]
): IndexedRecommendationWithId[] {
  const recommendations: IndexedRecommendationWithId[] = []

  for (const [index, modelRecommendation] of modelRecommendations.entries()) {
    const resolvedRecommendation = resolvedRecommendations[index]

    if (!resolvedRecommendation) {
      continue
    }

    recommendations.push(
      toIndexedReplacementRecommendation(modelRecommendation, resolvedRecommendation)
    )
  }

  return recommendations
}

async function resolveInitialRecommendations(
  modelRecommendations: InitialModelRecommendation[],
  event?: H3Event
): Promise<{ recommendations: IndexedRecommendationWithId[]; tmdbFallbackCount: number }> {
  const result = await appendTmdbIds(modelRecommendations.map(toRecommendation), event)

  return {
    recommendations: toIndexedRecommendations(modelRecommendations, result.recommendations),
    tmdbFallbackCount: result.tmdbFallbackCount,
  }
}

async function resolveReplacementRecommendations(
  modelRecommendations: ReplacementModelRecommendation[],
  event?: H3Event
): Promise<{ recommendations: IndexedRecommendationWithId[]; tmdbFallbackCount: number }> {
  const result = await appendTmdbIds(modelRecommendations.map(toRecommendation), event)

  return {
    recommendations: toIndexedReplacementRecommendations(
      modelRecommendations,
      result.recommendations
    ),
    tmdbFallbackCount: result.tmdbFallbackCount,
  }
}

function toIndexes(recommendations: Array<{ index: number }>): number[] {
  return recommendations.map((recommendation) => recommendation.index)
}

export async function getRecommendationsFromPlatformAi(
  watchedMovies: WatchedMovieRecord[],
  myListMovies: WatchedMovieRecord[],
  userId?: string,
  event?: H3Event,
  excludedMovies: RecommendationWithId[] = []
): Promise<{
  recommendations: RecommendationWithId[]
  aiCandidateCount: number
  tmdbFallbackCount: number
  systemPrompt: string
  userMessage: string
}> {
  const validationState = createRecommendationValidationState(
    watchedMovies,
    myListMovies,
    toBlockedExcludedRecommendations(excludedMovies)
  )
  const acceptedRecommendations: IndexedRecommendationWithId[] = []
  let tmdbFallbackCount = 0
  let aiCandidateCount = 0

  const initialResult = await fetchInitialRecommendations(
    watchedMovies,
    myListMovies,
    excludedMovies,
    userId,
    event
  )
  const { systemPrompt, userMessage, raw, parsed } = initialResult
  const messages: PlatformAiMessage[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ]
  messages.push({
    role: 'assistant',
    content: raw,
  })

  aiCandidateCount += parsed.length
  const resolvedInitialResult = await resolveInitialRecommendations(parsed, event)
  tmdbFallbackCount += resolvedInitialResult.tmdbFallbackCount

  let validationResult = validateRecommendationBatch(
    resolvedInitialResult.recommendations,
    validationState
  )
  acceptedRecommendations.push(...validationResult.accepted)

  for (
    let round = 2;
    round <= MAX_RECOMMENDATION_ROUNDS &&
    acceptedRecommendations.length < TARGET_RECOMMENDATIONS &&
    validationResult.blocked.length > 0;
    round++
  ) {
    const replacementsNeeded = TARGET_RECOMMENDATIONS - acceptedRecommendations.length
    const followUpMessage = buildReplacementUserMessage(
      toIndexes(validationResult.accepted),
      toIndexes(validationResult.blocked),
      replacementsNeeded,
      shouldAskForDeeperCuts(validationResult)
    )

    messages.push({
      role: 'user',
      content: followUpMessage,
    })

    const replacementRaw = await askPlatformAi({
      systemPrompt,
      userMessage,
      messages: [...messages],
      schema: REPLACEMENT_RESPONSE_SCHEMA,
      schemaName: 'movie_recommendation_replacements',
      userId,
      event,
      rateLimit: false,
    })
    messages.push({
      role: 'assistant',
      content: replacementRaw,
    })

    const replacements = parseReplacementRecommendationResponse(replacementRaw, userId, event)
    aiCandidateCount += replacements.length
    const replacementResult = await resolveReplacementRecommendations(replacements, event)
    tmdbFallbackCount += replacementResult.tmdbFallbackCount
    validationResult = validateRecommendationBatch(
      replacementResult.recommendations,
      validationState
    )
    acceptedRecommendations.push(...validationResult.accepted)
  }

  return {
    recommendations: acceptedRecommendations.slice(0, TARGET_RECOMMENDATIONS),
    aiCandidateCount,
    tmdbFallbackCount,
    systemPrompt,
    userMessage,
  }
}
