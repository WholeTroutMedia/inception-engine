/**
 * @cle/core — Result<T, E> Monad
 *
 * A lightweight, zero-dependency Result type for explicit error handling
 * without exceptions. Used throughout the Creative Liberation Engine for deterministic
 * error propagation.
 *
 * Constitutional: Article IX (Error Recovery) — graceful failure always.
 *
 * Usage:
 *   const result = try_parse(input);
 *   if (isOk(result)) { console.log(result.value); }
 *   else { console.error(result.error); }
 */

// ─── Result Type ──────────────────────────────────────────────────────────────

/** A successful result wrapping a value */
export interface Ok<T> {
    readonly ok: true;
    readonly value: T;
}

/** A failed result wrapping an error */
export interface Err<E = string> {
    readonly ok: false;
    readonly error: E;
}

/** A value that is either Ok<T> or Err<E> */
export type Result<T, E = string> = Ok<T> | Err<E>;

// ─── Constructors ─────────────────────────────────────────────────────────────

/** Wrap a successful value in a Result */
export function Ok<T>(value: T): Ok<T> {
    return { ok: true, value };
}

/** Wrap an error in a Result */
export function Err<E = string>(error: E): Err<E> {
    return { ok: false, error };
}

// ─── Type Guards ──────────────────────────────────────────────────────────────

/** Returns true if the Result is Ok */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
    return result.ok === true;
}

/** Returns true if the Result is Err */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
    return result.ok === false;
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Unwrap a Result, throwing if it's Err.
 * Only use when failure is truly unexpected.
 */
export function unwrap<T>(result: Result<T>): T {
    if (isOk(result)) return result.value;
    throw new Error(`Result unwrap failed: ${result.error}`);
}

/**
 * Unwrap a Result, returning a default value if it's Err.
 * Safe alternative to unwrap().
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
    return isOk(result) ? result.value : defaultValue;
}

/**
 * Map the value of an Ok result.
 * Returns the original Err unchanged.
 */
export function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
    return isOk(result) ? Ok(fn(result.value)) : result;
}

/**
 * Map the error of an Err result.
 * Returns the original Ok unchanged.
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
    return isErr(result) ? Err(fn(result.error)) : result;
}

/**
 * Flat-map an Ok result through a function that returns a Result.
 * Short-circuits on Err.
 */
export function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E> {
    return isOk(result) ? fn(result.value) : result;
}

/**
 * Wrap a potentially-throwing function in a Result.
 * Returns Ok(value) or Err(error.message).
 */
export function tryResult<T>(fn: () => T): Result<T, string> {
    try {
        return Ok(fn());
    } catch (e) {
        return Err(e instanceof Error ? e.message : String(e));
    }
}

/**
 * Wrap an async potentially-throwing function in a Result.
 */
export async function tryResultAsync<T>(fn: () => Promise<T>): Promise<Result<T, string>> {
    try {
        return Ok(await fn());
    } catch (e) {
        return Err(e instanceof Error ? e.message : String(e));
    }
}
