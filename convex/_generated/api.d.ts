/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as characters from "../characters.js";
import type * as commitments from "../commitments.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as game from "../game.js";
import type * as github from "../github.js";
import type * as githubActions from "../githubActions.js";
import type * as lib_errors from "../lib/errors.js";
import type * as scanner from "../scanner.js";
import type * as scannerMutations from "../scannerMutations.js";
import type * as scannerQueries from "../scannerQueries.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  characters: typeof characters;
  commitments: typeof commitments;
  crons: typeof crons;
  crypto: typeof crypto;
  game: typeof game;
  github: typeof github;
  githubActions: typeof githubActions;
  "lib/errors": typeof lib_errors;
  scanner: typeof scanner;
  scannerMutations: typeof scannerMutations;
  scannerQueries: typeof scannerQueries;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
