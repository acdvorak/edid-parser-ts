declare global {
  declare type Satisfies<Base, T extends Base> = T;

  declare type InferSetType<S> = S extends Set<infer T> ? T : never;

  /**
   * Mapped type that returns all keys in type {@link T} whose values are
   * assignable (that is, _extend_) {@link V}.
   *
   * @example
   * // This:
   * type ElementGetter = KeysOfType<
   *   Document,
   *   (str: string) => HTMLElement | null
   * >;
   *
   * // Is equivalent to:
   * type ElementGetter = 'createElement' | 'getElementById' | 'querySelector';
   */
  declare type KeysOfType<T, V> = keyof {
    [P in keyof T as T[P] extends V ? P : never]: P;
  };

  declare type SetNullable<T extends object, K extends keyof T> = {
    [P in keyof T]: P extends K ? T[P] | null : T[P];
  };

  declare type Without<
    T,
    K extends T extends object ? keyof T : T,
  > = T extends object
    ? Omit<T, Satisfies<keyof T, K>>
    : Exclude<T, Satisfies<keyof T, K>>;

  type SpaceToUnder<S extends string> = S extends `${infer First} ${infer Rest}`
    ? `${First}_${SpaceToUnder<Rest>}`
    : S;

  type HyphenToUnder<S extends string> =
    S extends `${infer First}-${infer Rest}`
      ? `${First}_${HyphenToUnder<Rest>}`
      : S;

  type PeriodToUnder<S extends string> =
    S extends `${infer First}.${infer Rest}`
      ? `${First}_${PeriodToUnder<Rest>}`
      : S;

  type SlashToUnder<S extends string> = S extends `${infer First}/${infer Rest}`
    ? `${First}_${SlashToUnder<Rest>}`
    : S;

  declare type TitleToSnakeCase<S extends string> = SlashToUnder<
    PeriodToUnder<SpaceToUnder<HyphenToUnder<Lowercase<S>>>>
  >;

  type X = TitleToSnakeCase<'.Hello. World.'>;

  declare type SemVer2 = `${number}.${number}`;
  declare type SemVer3 = `${number}.${number}.${number}`;
  declare type SemVer4 = `${number}.${number}.${number}.${number}`;

  declare type DisposeSync = () => void;
  declare type DisposeAsync = () => Promise<void>;

  declare interface IDisposable {
    dispose: DisposeSync | DisposeAsync;
  }
}

export {};
