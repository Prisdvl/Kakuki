var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = /* @__PURE__ */ Symbol();

// node_modules/hono/dist/utils/buffer.js
var bufferToFormData = /* @__PURE__ */ __name((arrayBuffer, contentType) => {
  const response = new Response(arrayBuffer, {
    headers: {
      // Normalize the media type (case-insensitive) while keeping parameters like the boundary
      "Content-Type": contentType.replace(/^[^;]+/, (mediaType) => mediaType.toLowerCase())
    }
  });
  return response.formData();
}, "bufferToFormData");

// node_modules/hono/dist/utils/body.js
var MAX_NESTING_DEPTH = 32;
var MAX_NESTED_OBJECTS = 1e4;
var isRawRequest = /* @__PURE__ */ __name((request) => "headers" in request, "isRawRequest");
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const contentType = headers.get("Content-Type");
  const mediaType = contentType?.split(";")[0].trim().toLowerCase();
  if (mediaType === "multipart/form-data" || mediaType === "application/x-www-form-urlencoded") {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  if (!isRawRequest(request) && request.bodyCache.formData) {
    return convertFormDataToBodyData(
      await request.bodyCache.formData,
      options
    );
  }
  const headers = isRawRequest(request) ? request.headers : request.raw.headers;
  const arrayBuffer = await request.arrayBuffer();
  const formDataPromise = bufferToFormData(arrayBuffer, headers.get("Content-Type") || "");
  if (!isRawRequest(request)) {
    request.bodyCache.formData = formDataPromise;
  }
  const formData = await formDataPromise;
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  const nestingState = { count: 0 };
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value, nestingState);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value, state) => {
  if (/(?:^|\.)__proto__\./.test(key)) {
    return;
  }
  let nestedForm = form;
  const keys = key.split(".", MAX_NESTING_DEPTH + 2);
  if (keys.length > MAX_NESTING_DEPTH + 1) {
    throwNestingLimitExceeded();
  }
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        if (state.count++ >= MAX_NESTED_OBJECTS) {
          throwNestingLimitExceeded();
        }
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");
var throwNestingLimitExceeded = /* @__PURE__ */ __name(() => {
  throw new Error("Nesting limit exceeded");
}, "throwNestingLimitExceeded");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match2, index) => {
    const mark = `@${index}`;
    groups.push([mark, match2]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match2 = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match2) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match2[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match2[1], new RegExp(`^${match2[2]}(?=/${next})`)] : [label, match2[1], new RegExp(`^${match2[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match2[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str2, decoder) => {
  try {
    return decoder(str2);
  } catch {
    return str2.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match2) => {
      try {
        return decoder(match2);
      } catch {
        return match2;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str2) => tryDecode(str2, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf("/", url.indexOf(":") + 4);
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const hashIndex = url.indexOf("#", i);
      const end = queryIndex === -1 ? hashIndex === -1 ? void 0 : hashIndex : hashIndex === -1 ? queryIndex : Math.min(queryIndex, hashIndex);
      const path = url.slice(start, end);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63 || charCode === 35) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (segment.charCodeAt(segment.length - 1) === 63) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.slice(0, -1);
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var tryDecodeURIComponent = /* @__PURE__ */ __name((str2) => str2.indexOf("%") !== -1 ? tryDecode(str2, decodeURIComponent_) : str2, "tryDecodeURIComponent");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return tryDecodeURIComponent(value);
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  const hashIndex = url.indexOf("#", 8);
  if (hashIndex !== -1) {
    url = url.slice(0, hashIndex);
  }
  let encoded;
  if (!multiple && key && key.indexOf("%") === -1 && key.indexOf("+") === -1) {
    let keyIndex2 = url.indexOf("?", 8);
    if (keyIndex2 === -1) {
      return void 0;
    }
    if (!url.startsWith(key, keyIndex2 + 1)) {
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = /* @__PURE__ */ Object.create(null);
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  /**
   * `.raw` can get the raw Request object.
   *
   * @see {@link https://hono.dev/docs/api/request#raw}
   *
   * @example
   * ```ts
   * // For Cloudflare Workers
   * app.post('/', async (c) => {
   *   const metadata = c.req.raw.cf?.hostMetadata?
   *   ...
   * })
   * ```
   */
  raw;
  #validatedData;
  // Short name of validatedData
  #matchResult;
  routeIndex = 0;
  /**
   * `.path` can get the pathname of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#path}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const pathname = c.req.path // `/about/me`
   * })
   * ```
   */
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex]?.[1][key];
    const param = this.#getParamValue(paramKey);
    return param && tryDecodeURIComponent(param);
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex]?.[1] ?? {});
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value !== void 0) {
        decoded[key] = tryDecodeURIComponent(value);
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = /* @__PURE__ */ Object.create(null);
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    for (const anyCachedKey in bodyCache) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  /**
   * `.json()` can parse Request body of type `application/json`
   *
   * @see {@link https://hono.dev/docs/api/request#json}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.json()
   * })
   * ```
   */
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  /**
   * `.text()` can parse Request body of type `text/plain`
   *
   * @see {@link https://hono.dev/docs/api/request#text}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.text()
   * })
   * ```
   */
  text() {
    return this.#cachedBody("text");
  }
  /**
   * `.arrayBuffer()` parse Request body as an `ArrayBuffer`
   *
   * @see {@link https://hono.dev/docs/api/request#arraybuffer}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.arrayBuffer()
   * })
   * ```
   */
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  /**
   * `.bytes()` parses the request body as a `Uint8Array`.
   *
   * @see {@link https://hono.dev/docs/api/request#bytes}
   *
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.bytes()
   * })
   * ```
   */
  bytes() {
    return this.#cachedBody("arrayBuffer").then((buffer) => new Uint8Array(buffer));
  }
  /**
   * Parses the request body as a `Blob`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.blob();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#blob
   */
  blob() {
    return this.#cachedBody("blob");
  }
  /**
   * Parses the request body as `FormData`.
   * @example
   * ```ts
   * app.post('/entry', async (c) => {
   *   const body = await c.req.formData();
   * });
   * ```
   * @see https://hono.dev/docs/api/request#formdata
   */
  formData() {
    return this.#cachedBody("formData");
  }
  /**
   * Adds validated data to the request.
   *
   * @param target - The target of the validation.
   * @param data - The validated data to add.
   */
  addValidatedData(target, data) {
    ;
    (this.#validatedData ??= {})[target] = data;
  }
  valid(target) {
    return this.#validatedData?.[target];
  }
  /**
   * `.url()` can get the request url strings.
   *
   * @see {@link https://hono.dev/docs/api/request#url}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const url = c.req.url // `http://localhost:8787/about/me`
   *   ...
   * })
   * ```
   */
  get url() {
    return this.raw.url;
  }
  /**
   * `.method()` can get the method name of the request.
   *
   * @see {@link https://hono.dev/docs/api/request#method}
   *
   * @example
   * ```ts
   * app.get('/about/me', (c) => {
   *   const method = c.req.method // `GET`
   * })
   * ```
   */
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  /**
   * `.matchedRoutes()` can return a matched route in the handler
   *
   * @deprecated
   *
   * Use matchedRoutes helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#matchedroutes}
   *
   * @example
   * ```ts
   * app.use('*', async function logger(c, next) {
   *   await next()
   *   c.req.matchedRoutes.forEach(({ handler, method, path }, i) => {
   *     const name = handler.name || (handler.length < 2 ? '[handler]' : '[middleware]')
   *     console.log(
   *       method,
   *       ' ',
   *       path,
   *       ' '.repeat(Math.max(10 - path.length, 0)),
   *       name,
   *       i === c.req.routeIndex ? '<- respond from here' : ''
   *     )
   *   })
   * })
   * ```
   */
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  /**
   * `routePath()` can retrieve the path registered within the handler
   *
   * @deprecated
   *
   * Use routePath helper defined in "hono/route" instead.
   *
   * @see {@link https://hono.dev/docs/api/request#routepath}
   *
   * @example
   * ```ts
   * app.get('/posts/:id', (c) => {
   *   return c.json({ path: c.req.routePath })
   * })
   * ```
   */
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str2, phase, preserveCallbacks, context, buffer) => {
  if (typeof str2 === "object" && !(str2 instanceof String)) {
    if (!(str2 instanceof Promise)) {
      str2 = str2.toString();
    }
    if (str2 instanceof Promise) {
      str2 = await str2;
    }
  }
  const callbacks = str2.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str2);
  }
  if (buffer) {
    buffer[0] += str2;
  } else {
    buffer = [str2];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str22) => resolveCallback(str22, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var createResponseInstance = /* @__PURE__ */ __name((body, init) => new Response(body, init), "createResponseInstance");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  /**
   * `.env` can get bindings (environment variables, secrets, KV namespaces, D1 database, R2 bucket etc.) in Cloudflare Workers.
   *
   * @see {@link https://hono.dev/docs/api/context#env}
   *
   * @example
   * ```ts
   * // Environment object for Cloudflare Workers
   * app.get('*', async c => {
   *   const counter = c.env.COUNTER
   * })
   * ```
   */
  env = {};
  #var;
  finalized = false;
  /**
   * `.error` can get the error object from the middleware if the Handler throws an error.
   *
   * @see {@link https://hono.dev/docs/api/context#error}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   await next()
   *   if (c.error) {
   *     // do something...
   *   }
   * })
   * ```
   */
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  /**
   * Creates an instance of the Context class.
   *
   * @param req - The Request object.
   * @param options - Optional configuration options for the context.
   */
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  /**
   * `.req` is the instance of {@link HonoRequest}.
   */
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#event}
   * The FetchEvent associated with the current request.
   *
   * @throws Will throw an error if the context does not have a FetchEvent.
   */
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#executionctx}
   * The ExecutionContext associated with the current request.
   *
   * @throws Will throw an error if the context does not have an ExecutionContext.
   */
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  /**
   * @see {@link https://hono.dev/docs/api/context#res}
   * The Response object for the current request.
   */
  get res() {
    return this.#res ||= createResponseInstance(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  /**
   * Sets the Response object for the current request.
   *
   * @param _res - The Response object to set.
   */
  set res(_res) {
    if (this.#res && _res) {
      _res = createResponseInstance(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  /**
   * `.render()` can create a response within a layout.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   return c.render('Hello!')
   * })
   * ```
   */
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  /**
   * Sets the layout for the response.
   *
   * @param layout - The layout to set.
   * @returns The layout function.
   */
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  /**
   * Gets the current layout for the response.
   *
   * @returns The current layout function.
   */
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  /**
   * `.setRenderer()` can set the layout in the custom middleware.
   *
   * @see {@link https://hono.dev/docs/api/context#render-setrenderer}
   *
   * @example
   * ```tsx
   * app.use('*', async (c, next) => {
   *   c.setRenderer((content) => {
   *     return c.html(
   *       <html>
   *         <body>
   *           <p>{content}</p>
   *         </body>
   *       </html>
   *     )
   *   })
   *   await next()
   * })
   * ```
   */
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  /**
   * `.header()` can set headers.
   *
   * @see {@link https://hono.dev/docs/api/context#header}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *
   *   // Append multiple headers using the append option (e.g. Vary)
   *   c.header('Vary', 'Accept-Encoding', { append: true })
   *   c.header('Vary', 'User-Agent', { append: true })
   *
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = createResponseInstance(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  /**
   * `.set()` can set the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.use('*', async (c, next) => {
   *   c.set('message', 'Hono is hot!!')
   *   await next()
   * })
   * ```
   */
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  /**
   * `.get()` can use the value specified by the key.
   *
   * @see {@link https://hono.dev/docs/api/context#set-get}
   *
   * @example
   * ```ts
   * app.get('/', (c) => {
   *   const message = c.get('message')
   *   return c.text(`The message is "${message}"`)
   * })
   * ```
   */
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  /**
   * `.var` can access the value of a variable.
   *
   * @see {@link https://hono.dev/docs/api/context#var}
   *
   * @example
   * ```ts
   * const result = c.var.client.oneMethod()
   * ```
   */
  // c.var.propName is a read-only
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    let responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders;
    if (typeof arg === "object" && arg.headers) {
      responseHeaders ??= new Headers();
      for (const [key, value] of new Headers(arg.headers)) {
        if (key === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      if (!responseHeaders) {
        let count = 0;
        for (const k in headers) {
          if (++count > 1 || typeof headers[k] !== "string") {
            responseHeaders = new Headers();
            break;
          }
        }
      }
      if (responseHeaders) {
        for (const k in headers) {
          const v = headers[k];
          if (typeof v === "string") {
            responseHeaders.set(k, v);
          } else {
            responseHeaders.delete(k);
            for (const v2 of v) {
              responseHeaders.append(k, v2);
            }
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return createResponseInstance(data, {
      status,
      headers: responseHeaders ?? headers
    });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  /**
   * `.body()` can return the HTTP response.
   * You can set headers with `.header()` and set HTTP status code with `.status`.
   * This can also be set in `.text()`, `.json()` and so on.
   *
   * @see {@link https://hono.dev/docs/api/context#body}
   *
   * @example
   * ```ts
   * app.get('/welcome', (c) => {
   *   // Set headers
   *   c.header('X-Message', 'Hello!')
   *   c.header('Content-Type', 'text/plain')
   *   // Set HTTP status code
   *   c.status(201)
   *
   *   // Return the response body
   *   return c.body('Thank you for coming')
   * })
   * ```
   */
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  /**
   * `.text()` can render text as `Content-Type:text/plain`.
   *
   * @see {@link https://hono.dev/docs/api/context#text}
   *
   * @example
   * ```ts
   * app.get('/say', (c) => {
   *   return c.text('Hello!')
   * })
   * ```
   */
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  /**
   * `.json()` can render JSON as `Content-Type:application/json`.
   *
   * @see {@link https://hono.dev/docs/api/context#json}
   *
   * @example
   * ```ts
   * app.get('/api', (c) => {
   *   return c.json({ message: 'Hello!' })
   * })
   * ```
   */
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  /**
   * `.redirect()` can Redirect, default status code is 302.
   *
   * @see {@link https://hono.dev/docs/api/context#redirect}
   *
   * @example
   * ```ts
   * app.get('/redirect', (c) => {
   *   return c.redirect('/')
   * })
   * app.get('/redirect-permanently', (c) => {
   *   return c.redirect('/', 301)
   * })
   * ```
   */
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      // Multibyes should be encoded
      // eslint-disable-next-line no-control-regex
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  /**
   * `.notFound()` can return the Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/context#notfound}
   *
   * @example
   * ```ts
   * app.get('/notfound', (c) => {
   *   return c.notFound()
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => createResponseInstance();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch", "query"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class _Hono {
  static {
    __name(this, "_Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  query;
  all;
  on;
  use;
  /*
    This class is like an abstract class and does not have a router.
    To use it, inherit the class and implement router in the constructor.
  */
  router;
  getPath;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        const methodName = method.toUpperCase();
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(methodName, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(methodName, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          const methodName = m.toUpperCase();
          for (const handler of handlers) {
            this.#addRoute(methodName, this.#path, handler);
          }
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new _Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  // Cannot use `#` because it requires visibility at JavaScript runtime.
  errorHandler = errorHandler;
  /**
   * `.route()` allows grouping other Hono instance in routes.
   *
   * @see {@link https://hono.dev/docs/api/routing#grouping}
   *
   * @param {string} path - base Path
   * @param {Hono} app - other Hono instance
   * @returns {Hono} routed Hono instance
   *
   * @example
   * ```ts
   * const app = new Hono()
   * const app2 = new Hono()
   *
   * app2.get("/user", (c) => c.text("user"))
   * app.route("/api", app2) // GET /api/user
   * ```
   */
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler, r.basePath);
    });
    return this;
  }
  /**
   * `.basePath()` allows base paths to be specified.
   *
   * @see {@link https://hono.dev/docs/api/routing#base-path}
   *
   * @param {string} path - base Path
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * const api = new Hono().basePath('/api')
   * ```
   */
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  /**
   * `.onError()` handles an error and returns a customized Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#error-handling}
   *
   * @param {ErrorHandler} handler - request Handler for error
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.onError((err, c) => {
   *   console.error(`${err}`)
   *   return c.text('Custom Error Message', 500)
   * })
   * ```
   */
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  /**
   * `.notFound()` allows you to customize a Not Found Response.
   *
   * @see {@link https://hono.dev/docs/api/hono#not-found}
   *
   * @param {NotFoundHandler} handler - request handler for not-found
   * @returns {Hono} changed Hono instance
   *
   * @example
   * ```ts
   * app.notFound((c) => {
   *   return c.text('Custom 404 Message', 404)
   * })
   * ```
   */
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  /**
   * `.mount()` allows you to mount applications built with other frameworks into your Hono application.
   *
   * @see {@link https://hono.dev/docs/api/hono#mount}
   *
   * @param {string} path - base Path
   * @param {Function} applicationHandler - other Request Handler
   * @param {MountOptions} [options] - options of `.mount()`
   * @returns {Hono} mounted Hono instance
   *
   * @example
   * ```ts
   * import { Router as IttyRouter } from 'itty-router'
   * import { Hono } from 'hono'
   * // Create itty-router application
   * const ittyRouter = IttyRouter()
   * // GET /itty-router/hello
   * ittyRouter.get('/hello', () => new Response('Hello from itty-router'))
   *
   * const app = new Hono()
   * app.mount('/itty-router', ittyRouter.handle)
   * ```
   *
   * @example
   * ```ts
   * const app = new Hono()
   * // Send the request to another application without modification.
   * app.mount('/app', anotherApp, {
   *   replaceRequest: (req) => req,
   * })
   * ```
   */
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = this.getPath(request).slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler, baseRoutePath) {
    path = mergePath(this._basePath, path);
    const r = {
      basePath: baseRoutePath !== void 0 ? mergePath(this._basePath, baseRoutePath) : this._basePath,
      path,
      method,
      handler
    };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  /**
   * `.fetch()` will be entry point of your app.
   *
   * @see {@link https://hono.dev/docs/api/hono#fetch}
   *
   * @param {Request} request - request Object of request
   * @param {Env} env - env Object
   * @param {ExecutionContext} executionCtx - context of execution
   * @returns {Response | Promise<Response>} response of request
   *
   */
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  /**
   * `.request()` is a useful method for testing.
   * You can pass a URL or pathname to send a GET request.
   * app will return a Response object.
   * ```ts
   * test('GET /hello is ok', async () => {
   *   const res = await app.request('/hello')
   *   expect(res.status).toBe(200)
   * })
   * ```
   * @see https://hono.dev/docs/api/hono#request
   */
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  /**
   * `.fire()` automatically adds a global fetch event listener.
   * This can be useful for environments that adhere to the Service Worker API, such as non-ES module Cloudflare Workers.
   * @deprecated
   * Use `fire` from `hono/service-worker` instead.
   * ```ts
   * import { Hono } from 'hono'
   * import { fire } from 'hono/service-worker'
   *
   * const app = new Hono()
   * // ...
   * fire(app)
   * ```
   * @see https://hono.dev/docs/api/hono#fire
   * @see https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
   * @see https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/
   */
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/utils.js
var createNullObject = /* @__PURE__ */ __name(() => /* @__PURE__ */ Object.create(null), "createNullObject");

// node_modules/hono/dist/router/reg-exp-router/matcher.js
var emptyParam = [];
function match(method, path) {
  const matchers = this.buildAllMatchers();
  const match2 = /* @__PURE__ */ __name(((method2, path2) => {
    const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
    const staticMatch = matcher[2][path2];
    if (staticMatch) {
      return staticMatch;
    }
    const match3 = path2.match(matcher[0]);
    if (!match3) {
      return [[], emptyParam];
    }
    const index = match3.indexOf("", 1);
    return [matcher[1][index], match3];
  }), "match2");
  this.match = match2;
  return match2(method, path);
}
__name(match, "match");

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = /* @__PURE__ */ Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return b === TAIL_WILDCARD_REG_EXP_STR ? -1 : 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class _Node {
  static {
    __name(this, "_Node");
  }
  // handler index of a dynamic path, or -1 for a static path terminal
  #index;
  #varIndex;
  #children = createNullObject();
  insert(tokens, index, paramMap, context, isStatic) {
    let node = this;
    for (let i = 0, len = tokens.length; i < len; i++) {
      const token = tokens[i];
      const pattern = token.length === 1 ? token === "*" ? i === len - 1 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : null : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
      let nextNode;
      if (pattern) {
        const name = pattern[1];
        let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
        if (name && pattern[2]) {
          if (regexpStr === ".*") {
            throw PATH_ERROR;
          }
          regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
          if (/\((?!\?:)/.test(regexpStr)) {
            throw PATH_ERROR;
          }
          if (regexpStr.length === 1 && regExpMetaChars.has(regexpStr)) {
            throw PATH_ERROR;
          }
        }
        nextNode = node.#children[regexpStr];
        if (!nextNode) {
          if (regexpStr !== ONLY_WILDCARD_REG_EXP_STR && regexpStr !== TAIL_WILDCARD_REG_EXP_STR) {
            for (const k in node.#children) {
              if (
                // a single-char pattern coexists with single-char literals as a literal does
                (regexpStr.length > 1 || k.length > 1) && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
              ) {
                throw PATH_ERROR;
              }
            }
          }
          nextNode = node.#children[regexpStr] = new _Node();
        }
        if (name !== "") {
          nextNode.#varIndex ??= context.varIndex++;
          paramMap.push([name, nextNode.#varIndex]);
        }
      } else {
        nextNode = node.#children[token];
        if (!nextNode) {
          for (const k in node.#children) {
            if (k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR) {
              throw PATH_ERROR;
            }
          }
          nextNode = node.#children[token] = new _Node();
        }
      }
      node = nextNode;
    }
    if (node.#index !== void 0) {
      throw PATH_ERROR;
    }
    node.#index = isStatic ? -1 : index;
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      const childStr = c.buildRegExpStr();
      return childStr === "" ? "" : (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + childStr;
    }).filter(Boolean);
    if (typeof this.#index === "number" && this.#index !== -1) {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  #index = 0;
  // dynamic path -> [handler index, param assoc]; static paths are not registered
  paths = createNullObject();
  insert(path, isStatic) {
    if (isStatic) {
      this.#root.insert(path.split(""), 0, [], this.#context, true);
      return;
    }
    const paramAssoc = [];
    const groups = [];
    let markedPath = path;
    for (let i = 0; ; ) {
      let replaced = false;
      markedPath = markedPath.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = markedPath.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, this.#index, paramAssoc, this.#context, false);
    this.paths[path] = [this.#index++, paramAssoc];
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var wildcardRegExpCache = createNullObject();
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    `^${path.replace(
      /\/:[^/{}]+(?:\{\[\^\/]\+})?(?=[/{]|$)|\/?\*$|([.\\+*[^\]$()?{}|])/g,
      (match2, metaChar) => metaChar ? `\\${metaChar}` : match2 === "/*" ? TAIL_WILDCARD_REG_EXP_STR : match2 === "*" ? ONLY_WILDCARD_REG_EXP_STR : `/:${LABEL_REG_EXP_STR}`
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function findMiddleware(middleware, path) {
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  #tries;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: createNullObject() };
    this.#routes = { [METHOD_NAME_ALL]: createNullObject() };
    this.#tries = { [METHOD_NAME_ALL]: new Trie() };
  }
  #insertPath(method, path) {
    try {
      this.#tries[method].insert(path, !/\*|\/:/.test(path));
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      this.#tries[method] = new Trie();
      for (const handlerMap of [middleware, routes]) {
        handlerMap[method] = createNullObject();
        for (const p in handlerMap[METHOD_NAME_ALL]) {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
          this.#insertPath(method, p);
        }
      }
    }
    if (path === "/*") {
      path = "*";
    }
    const methods = method === METHOD_NAME_ALL ? Object.keys(middleware) : [method];
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      for (const m of methods) {
        if (!middleware[m][path]) {
          this.#insertPath(m, path);
          middleware[m][path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        }
      }
      for (const handlerMap of [middleware, routes]) {
        for (const m of methods) {
          for (const p in handlerMap[m]) {
            re.test(p) && handlerMap[m][p].push([handler, path]);
          }
        }
      }
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (const path2 of paths) {
      for (const m of methods) {
        if (!routes[m][path2]) {
          this.#insertPath(m, path2);
          routes[m][path2] = findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || [];
        }
        routes[m][path2].push([handler, path2]);
      }
    }
  }
  match = match;
  buildAllMatchers() {
    const matchers = createNullObject();
    for (const method of Object.keys(this.#routes)) {
      matchers[method] = this.#buildMatcher(method);
    }
    this.#middleware = this.#routes = this.#tries = void 0;
    wildcardRegExpCache = createNullObject();
    return matchers;
  }
  #buildMatcher(method) {
    const middleware = this.#middleware[method];
    const routes = this.#routes[method];
    const trie = this.#tries[method];
    const staticMap = createNullObject();
    const handlerData = [];
    const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
    for (const r of [middleware, routes]) {
      for (const path in r) {
        const handlers = r[path];
        const pathData = trie.paths[path];
        if (!pathData) {
          staticMap[path] = [handlers.map(([h]) => [h, createNullObject()]), emptyParam];
          continue;
        }
        handlerData[pathData[0]] = handlers.map(([h, handlerPath]) => [
          h,
          trie.paths[handlerPath][1].reduceRight((map, [key], i) => {
            map[key] = paramReplacementMap[pathData[1][i][1]];
            return map;
          }, createNullObject())
        ]);
      }
    }
    return [regexp, indexReplacementMap.map((i) => handlerData[i]), staticMap];
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = createNullObject();
var order = 0;
var Node2 = class _Node2 {
  static {
    __name(this, "_Node");
  }
  #methods = [];
  #children = createNullObject();
  #patterns = [];
  #pattern;
  #params = emptyParams;
  insert(method, path, handler) {
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = /* @__PURE__ */ new Set();
    let i = 0;
    for (const p of parts) {
      const nextP = parts[++i];
      const pattern = getPattern(p, nextP) || (nextP === void 0 && p && p.indexOf("*") === p.length - 1 ? p : null);
      const isParam = Array.isArray(pattern);
      const key = isParam ? pattern[0] : pattern || p;
      const child = curNode.#children[key] ||= new _Node2();
      if (pattern && !child.#pattern) {
        child.#pattern = pattern;
        curNode.#patterns.push(child);
      }
      curNode = child;
      if (isParam) {
        possibleKeys.add(pattern[1]);
      }
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: [...possibleKeys],
        score: ++order
      }
    });
  }
  #pushHandlerSets(handlerSets, node, method, nodeParams, params) {
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      if (handlerSet) {
        handlerSet.params = createNullObject();
        handlerSets.push(handlerSet);
        for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
          const key = handlerSet.possibleKeys[i2];
          handlerSet.params[key] = params?.[key] && !i2 ? params[key] : nodeParams[key] ?? params?.[key];
        }
      }
    }
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    const len = parts.length;
    let partOffsets = null;
    for (let i = 0; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              this.#pushHandlerSets(handlerSets, nextNode.#children["*"], method, node.#params);
            }
            this.#pushHandlerSets(handlerSets, nextNode, method, node.#params);
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (const child of node.#patterns) {
          const pattern = child.#pattern;
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (typeof pattern === "string") {
            if (pattern === "*" || part.startsWith(pattern.slice(0, -1))) {
              this.#pushHandlerSets(handlerSets, child, method, node.#params);
              if (pattern === "*") {
                child.#params = params;
                tempNodes.push(child);
              }
            }
            continue;
          }
          const [, name, matcher] = pattern;
          if (!part && matcher === true) {
            continue;
          }
          if (matcher !== true) {
            if (!partOffsets) {
              partOffsets = [];
              let offset = path[0] === "/" ? 1 : 0;
              for (let p = 0; p < len; p++) {
                partOffsets[p] = offset;
                offset += parts[p].length + 1;
              }
            }
            const restPathString = path.slice(partOffsets[i]);
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              this.#pushHandlerSets(handlerSets, child, method, node.#params, params);
              if (m[0].length === restPathString.length && child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  node.#params,
                  params
                );
              }
              for (const _ in child.#children) {
                child.#params = params;
                const componentCount = m[0].match(/\//g)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
                break;
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              this.#pushHandlerSets(handlerSets, child, method, params, node.#params);
              if (child.#children["*"]) {
                this.#pushHandlerSets(
                  handlerSets,
                  child.#children["*"],
                  method,
                  params,
                  node.#params
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      const shifted = curNodesQueue.shift();
      curNodes = shifted ? tempNodes.concat(shifted) : tempNodes;
    }
    if (handlerSets[1]) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node = new Node2();
  add(method, path, handler) {
    for (const result of checkOptionalParameter(path) || [path]) {
      this.#node.insert(method, result, handler);
    }
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  /**
   * Creates an instance of the Hono class.
   *
   * @param options - Optional configuration options for the Hono instance.
   */
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// src/util.ts
var ok = /* @__PURE__ */ __name((data, code = 200, message = "ok") => Response.json({ code, message, data }, { status: code === 204 ? 200 : code }), "ok");
var ok201 = /* @__PURE__ */ __name((data, message = "ok") => Response.json({ code: 201, message, data }, { status: 201 }), "ok201");
var ok204 = /* @__PURE__ */ __name((message = "\u5220\u9664\u6210\u529F") => (
  // HTTP 204 不允许 body（workerd 强制），改用 200 + body 内 code:204，前端解析兼容
  Response.json({ code: 204, message, data: null }, { status: 200 })
), "ok204");
var fail = /* @__PURE__ */ __name((code, message, data = null) => Response.json({ code, message, data }, { status: code }), "fail");
var nowIso = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"), "nowIso");
function clientIp(c) {
  const cf = c.req.header("CF-Connecting-IP");
  if (cf) return cf.trim();
  const fwd = c.req.header("X-Forwarded-For");
  if (fwd) return fwd.split(",")[0].trim();
  return null;
}
__name(clientIp, "clientIp");
var PBKDF2_ITERATIONS = 1e5;
var b64 = /* @__PURE__ */ __name((buf) => {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}, "b64");
var b64decode = /* @__PURE__ */ __name((s) => {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}, "b64decode");
var pbkdf2Derive = /* @__PURE__ */ __name(async (password, salt, iterations) => {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations },
    key,
    256
  );
  return b64(bits);
}, "pbkdf2Derive");
async function hashPassword(password) {
  const salt = Array.from(crypto.getRandomValues(new Uint8Array(9))).map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await pbkdf2Derive(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2_sha256$${PBKDF2_ITERATIONS}$${salt}$${hash}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(password, encoded) {
  try {
    const [algo, iterStr, salt, hashB64] = encoded.split("$");
    if (algo !== "pbkdf2_sha256" || !iterStr || !salt || !hashB64) return false;
    const derived = await pbkdf2Derive(password, salt, parseInt(iterStr, 10));
    const a = b64decode(derived);
    const b = b64decode(hashB64);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
    return diff === 0;
  } catch {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");
var getSecret = /* @__PURE__ */ __name((env) => env.JWT_SECRET || env.JWT_SECRET_DEV || "insecure-default", "getSecret");
var hmacKey = /* @__PURE__ */ __name((secret) => crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
  "sign",
  "verify"
]), "hmacKey");
var b64url = /* @__PURE__ */ __name((input) => btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64url");
var b64urlDecode = /* @__PURE__ */ __name((input) => {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - input.length % 4);
  return atob(input.replace(/-/g, "+").replace(/_/g, "/") + pad);
}, "b64urlDecode");
var ACCESS_TTL = 24 * 3600;
var REFRESH_TTL = 7 * 24 * 3600;
async function signToken(env, tokenType, user) {
  const now = Math.floor(Date.now() / 1e3);
  const payload = {
    token_type: tokenType,
    user_id: user.id,
    username: user.username,
    is_staff: user.is_staff,
    iat: now,
    exp: now + (tokenType === "access" ? ACCESS_TTL : REFRESH_TTL),
    jti: crypto.randomUUID(),
    iss: env.JWT_ISSUER || "kakuki"
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const key = await hmacKey(getSecret(env));
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(b64(sig))}`;
}
__name(signToken, "signToken");
async function verifyToken(env, token, expect) {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const key = await hmacKey(getSecret(env));
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64decode(b64urlDecode(sig)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (payload.token_type !== expect) return null;
    if (payload.exp * 1e3 < Date.now()) return null;
    if (payload.iss && env.JWT_ISSUER && payload.iss !== env.JWT_ISSUER) return null;
    return payload;
  } catch {
    return null;
  }
}
__name(verifyToken, "verifyToken");
function pageParams(c) {
  const page = Math.max(1, parseInt(c.req.query("page") || "1", 10) || 1);
  const raw2 = parseInt(c.req.query("page_size") || "10", 10);
  const pageSize = Math.min(Math.max(raw2 > 0 ? raw2 : 10, 1), 100);
  return { page, pageSize };
}
__name(pageParams, "pageParams");
function paginated(items, total, p, path, query) {
  const last = Math.max(1, Math.ceil(total / p.pageSize));
  const build = /* @__PURE__ */ __name((n) => {
    if (n < 1 || n > last) return null;
    const qs = new URLSearchParams(query);
    qs.set("page", String(n));
    qs.set("page_size", String(p.pageSize));
    return `${path}?${qs.toString()}`;
  }, "build");
  return {
    count: total,
    next: build(p.page + 1),
    previous: build(p.page - 1),
    results: items
  };
}
__name(paginated, "paginated");

// src/auth.ts
var profileOf = /* @__PURE__ */ __name((u) => ({
  id: u.id,
  username: u.username,
  nickname: u.nickname,
  email: u.email,
  avatar: u.avatar,
  bio: u.bio,
  is_staff: !!u.is_staff,
  date_joined: u.date_joined
}), "profileOf");
var USER_BY = "SELECT * FROM users WHERE ";
async function getUserById(db, id) {
  return await db.prepare(`${USER_BY}id = ?1`).bind(id).first() ?? null;
}
__name(getUserById, "getUserById");
async function getUserByUsername(db, username) {
  return await db.prepare(`${USER_BY}username = ?1`).bind(username).first() ?? null;
}
__name(getUserByUsername, "getUserByUsername");
async function authUser(c) {
  const auth = c.req.header("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const payload = await verifyToken(c.env, auth.slice(7), "access");
  if (!payload) return null;
  return getUserById(c.env.DB, payload.user_id);
}
__name(authUser, "authUser");
var invalidCredentials = /* @__PURE__ */ __name(() => fail(401, "No active account found with the given credentials", { code: "token_not_valid" }), "invalidCredentials");
var tokenInvalid = /* @__PURE__ */ __name(() => fail(401, "Token is invalid or expired", { code: "token_not_valid" }), "tokenInvalid");
var authRoutes = new Hono2().post("/auth/register/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const nickname = typeof body.nickname === "string" && body.nickname.trim() ? body.nickname.trim() : username;
  const errors = {};
  if (!username) errors.username = ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"];
  else if (username.length > 150) errors.username = ["\u786E\u4FDD\u8BE5\u5B57\u6BB5\u5305\u542B\u7684\u5B57\u7B26\u4E0D\u8D85\u8FC7 150 \u4E2A\u3002"];
  if (!password) errors.password = ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"];
  else if (password.length < 6) errors.password = ["\u5BC6\u7801\u957F\u5EA6\u81F3\u5C11 6 \u4F4D\u3002"];
  if (Object.keys(errors).length) return fail(400, "Invalid input.", errors);
  if (await getUserByUsername(c.env.DB, username)) {
    return fail(400, "Invalid input.", { username: ["\u5177\u6709 username \u7684 \u7528\u6237 \u5DF2\u5B58\u5728\u3002"] });
  }
  const hashed = await hashPassword(password);
  const res = await c.env.DB.prepare(
    "INSERT INTO users (username, password, email, nickname, is_staff, is_superuser, date_joined) VALUES (?1, ?2, ?3, ?4, 0, 0, ?5)"
  ).bind(username, hashed, email, nickname, nowIso()).run();
  const user = await getUserById(c.env.DB, res.meta.last_row_id);
  return ok201(profileOf(user), "\u6CE8\u518C\u6210\u529F");
}).post("/auth/login/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const user = username ? await getUserByUsername(c.env.DB, username) : null;
  if (!user || !await verifyPassword(password, user.password)) return invalidCredentials();
  const access = await signToken(c.env, "access", user);
  const refresh = await signToken(c.env, "refresh", user);
  return Response.json({ access, refresh });
}).post("/auth/refresh/", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const refresh = typeof body.refresh === "string" ? body.refresh : "";
  const payload = refresh ? await verifyToken(c.env, refresh, "refresh") : null;
  if (!payload) return tokenInvalid();
  const user = await getUserById(c.env.DB, payload.user_id);
  if (!user) return tokenInvalid();
  const access = await signToken(c.env, "access", user);
  return Response.json({ access });
}).get("/auth/me/", async (c) => {
  const user = await authUser(c);
  if (!user) return tokenInvalid();
  return ok(profileOf(user));
}).put("/auth/me/", async (c) => {
  const user = await authUser(c);
  if (!user) return tokenInvalid();
  const body = await c.req.json().catch(() => ({}));
  const nickname = typeof body.nickname === "string" ? body.nickname : user.nickname;
  const email = typeof body.email === "string" ? body.email : user.email;
  const bio = typeof body.bio === "string" ? body.bio : user.bio;
  const avatar = body.avatar === null ? null : typeof body.avatar === "string" && body.avatar ? body.avatar : user.avatar;
  await c.env.DB.prepare("UPDATE users SET nickname = ?1, email = ?2, bio = ?3, avatar = ?4 WHERE id = ?5").bind(nickname, email, bio, avatar, user.id).run();
  const fresh = await getUserById(c.env.DB, user.id);
  return ok(profileOf(fresh), 200, "\u66F4\u65B0\u6210\u529F");
}).post("/auth/change-password/", async (c) => {
  const user = await authUser(c);
  if (!user) return tokenInvalid();
  const body = await c.req.json().catch(() => ({}));
  const oldPassword = typeof body.old_password === "string" ? body.old_password : "";
  const newPassword = typeof body.new_password === "string" ? body.new_password : "";
  if (!newPassword || newPassword.length < 6) {
    return fail(400, "Invalid input.", { new_password: ["\u786E\u4FDD\u8BE5\u5B57\u6BB5\u81F3\u5C11\u5305\u542B 6 \u4E2A\u5B57\u7B26\u3002"] });
  }
  if (!await verifyPassword(oldPassword, user.password)) {
    return fail(400, "\u539F\u5BC6\u7801\u9519\u8BEF");
  }
  const hashed = await hashPassword(newPassword);
  await c.env.DB.prepare("UPDATE users SET password = ?1 WHERE id = ?2").bind(hashed, user.id).run();
  return ok(null, 200, "\u5BC6\u7801\u4FEE\u6539\u6210\u529F");
});

// src/blog.ts
var num = /* @__PURE__ */ __name((v) => typeof v === "number" ? v : 0, "num");
var str = /* @__PURE__ */ __name((v) => typeof v === "string" ? v : "", "str");
var anonIp = /* @__PURE__ */ __name((c) => clientIp(c) ?? "unknown", "anonIp");
var categoryNested = /* @__PURE__ */ __name((r) => r.cat_id == null ? null : { id: r.cat_id, name: r.cat_name, description: r.cat_desc, article_count: num(r.cat_article_count) }, "categoryNested");
var ARTICLE_LIST_FIELDS = `
  a.id, a.title, a.summary, a.cover_image, a.views, a.is_top, a.created_at, a.updated_at,
  a.category_id AS cat_id, c.name AS cat_name, c.description AS cat_desc,
  (SELECT COUNT(*) FROM articles x WHERE x.category_id = a.category_id) AS cat_article_count,
  u.nickname AS author_nickname,
  (SELECT COUNT(*) FROM comments cm WHERE cm.article_id = a.id) AS comment_count,
  (SELECT COUNT(*) FROM article_likes l WHERE l.article_id = a.id) AS like_count`;
var ARTICLE_JOIN = `
  FROM articles a
  LEFT JOIN categories c ON c.id = a.category_id
  LEFT JOIN users u ON u.id = a.author_id`;
var articleListItem = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  cover_image: r.cover_image,
  category: categoryNested(r),
  author_name: r.author_nickname,
  views: r.views,
  is_top: !!r.is_top,
  comment_count: r.comment_count,
  like_count: r.like_count,
  created_at: r.created_at,
  updated_at: r.updated_at
}), "articleListItem");
var ORDERING_MAP = {
  created_at: "a.created_at ASC",
  "-created_at": "a.created_at DESC",
  views: "a.views ASC",
  "-views": "a.views DESC"
};
var blogRoutes = new Hono2().get("/categories/", async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
       FROM categories c ORDER BY article_count DESC, c.id ASC`
  ).all();
  const data = rows.results.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    article_count: r.article_count
  }));
  return ok(data);
}).get("/categories/manage/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const rows = await c.env.DB.prepare(
    `SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count
       FROM categories c ORDER BY article_count DESC, c.id ASC`
  ).all();
  return ok(rows.results.map((r) => ({ id: r.id, name: r.name, description: r.description, article_count: r.article_count })));
}).post("/categories/manage/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const body = await c.req.json().catch(() => ({}));
  const name = str(body.name).trim();
  if (!name) return fail(400, "Invalid input.", { name: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  const dup = await c.env.DB.prepare("SELECT id FROM categories WHERE name = ?1").bind(name).first();
  if (dup) return fail(400, "Invalid input.", { name: ["\u5177\u6709 name \u7684 \u5206\u7C7B \u5DF2\u5B58\u5728\u3002"] });
  const res = await c.env.DB.prepare("INSERT INTO categories (name, description) VALUES (?1, ?2)").bind(name, str(body.description)).run();
  const row = await c.env.DB.prepare(
    "SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count FROM categories c WHERE c.id = ?1"
  ).bind(res.meta.last_row_id).first();
  return ok201({ id: row.id, name: row.name, description: row.description, article_count: row.article_count });
}).put("/categories/manage/:id/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const id = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => ({}));
  const row = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?1").bind(id).first();
  if (!row) return fail(404, "\u672A\u627E\u5230\u3002");
  const name = str(body.name).trim() || str(row.name);
  const description = typeof body.description === "string" ? body.description : str(row.description);
  await c.env.DB.prepare("UPDATE categories SET name = ?1, description = ?2 WHERE id = ?3").bind(name, description, id).run();
  const fresh = await c.env.DB.prepare(
    "SELECT c.*, (SELECT COUNT(*) FROM articles a WHERE a.category_id = c.id) AS article_count FROM categories c WHERE c.id = ?1"
  ).bind(id).first();
  return ok({ id: fresh.id, name: fresh.name, description: fresh.description, article_count: fresh.article_count }, 200, "\u66F4\u65B0\u6210\u529F");
}).delete("/categories/manage/:id/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const id = Number(c.req.param("id"));
  const res = await c.env.DB.prepare("DELETE FROM categories WHERE id = ?1").bind(id).run();
  if (!res.meta.changes) return fail(404, "\u672A\u627E\u5230\u3002");
  return ok204("\u5220\u9664\u6210\u529F");
}).get("/articles/", async (c) => {
  const p = pageParams(c);
  const where = [];
  const binds = [];
  const search = c.req.query("search");
  if (search) {
    where.push("(a.title LIKE ?1 OR a.content LIKE ?1)");
    binds.push(`%${search}%`);
  }
  const categoryId = c.req.query("category");
  if (categoryId && /^\d+$/.test(categoryId)) {
    binds.push(Number(categoryId));
    where.push(`a.category_id = ?${binds.length}`);
  }
  const year = c.req.query("year");
  if (year && /^\d{4}$/.test(year)) {
    binds.push(year);
    where.push(`CAST(strftime('%Y', a.created_at) AS INTEGER) = ?${binds.length}`);
  }
  const month = c.req.query("month");
  if (month && /^\d{1,2}$/.test(month)) {
    binds.push(Number(month));
    where.push(`CAST(strftime('%m', a.created_at) AS INTEGER) = ?${binds.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const orderSql = ORDERING_MAP[c.req.query("ordering") ?? ""] ?? "a.is_top DESC, a.created_at DESC";
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n ${ARTICLE_JOIN} ${whereSql}`).bind(...binds).first();
  const rows = await c.env.DB.prepare(
    `SELECT ${ARTICLE_LIST_FIELDS} ${ARTICLE_JOIN} ${whereSql} ORDER BY ${orderSql} LIMIT ?${binds.length + 1} OFFSET ?${binds.length + 2}`
  ).bind(...binds, p.pageSize, (p.page - 1) * p.pageSize).all();
  const url = new URL(c.req.url);
  const query = {};
  url.searchParams.forEach((v, k) => {
    if (k !== "page" && k !== "page_size") query[k] = v;
  });
  return ok(paginated(rows.results.map(articleListItem), num(total?.n), p, url.pathname, query));
}).get("/articles/:id/", async (c) => {
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare(
    `SELECT a.*, u.nickname AS author_nickname, u.id AS author_id2, c.name AS cat_name, c.description AS cat_desc,
        (SELECT COUNT(*) FROM articles x WHERE x.category_id = a.category_id) AS cat_article_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.article_id = a.id) AS comment_count,
        (SELECT COUNT(*) FROM article_likes l WHERE l.article_id = a.id) AS like_count
       ${ARTICLE_JOIN.replace("LEFT JOIN users u ON u.id = a.author_id", "LEFT JOIN users u ON u.id = a.author_id")}
       WHERE a.id = ?1`
  ).bind(id).first();
  if (!row) return fail(404, "\u672A\u627E\u5230\u3002");
  await c.env.DB.prepare("UPDATE articles SET views = views + 1 WHERE id = ?1").bind(id).run();
  const user = await authUser(c);
  let liked = false;
  if (user) {
    liked = !!await c.env.DB.prepare("SELECT id FROM article_likes WHERE article_id = ?1 AND user_id = ?2").bind(id, user.id).first();
  } else {
    const ip = anonIp(c);
    liked = ip ? !!await c.env.DB.prepare("SELECT id FROM article_likes WHERE article_id = ?1 AND ip_address = ?2").bind(id, ip).first() : false;
  }
  const views = num(row.views) + 1;
  return ok({
    id: row.id,
    title: row.title,
    content: row.content,
    summary: row.summary,
    cover_image: row.cover_image,
    category: categoryNested(row),
    author_name: row.author_nickname,
    author_id: row.author_id2,
    views,
    is_top: !!row.is_top,
    comment_count: row.comment_count,
    like_count: row.like_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    liked
  });
}).post("/articles/create/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const body = await c.req.json().catch(() => ({}));
  const title = str(body.title).trim();
  const content = str(body.content);
  const errors = {};
  if (!title) errors.title = ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"];
  else if (title.length > 200) errors.title = ["\u786E\u4FDD\u8BE5\u5B57\u6BB5\u5305\u542B\u7684\u5B57\u7B26\u4E0D\u8D85\u8FC7 200 \u4E2A\u3002"];
  if (!content) errors.content = ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"];
  if (Object.keys(errors).length) return fail(400, "Invalid input.", errors);
  let categoryId = null;
  if (body.category != null) {
    const cid = Number(body.category);
    const cat = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?1").bind(cid).first();
    if (!cat) return fail(400, "Invalid input.", { category: [`\u65E0\u6548\u7684\u4E3B\u952E "${body.category}" \u2014\u2014 \u5BF9\u8C61\u4E0D\u5B58\u5728\u3002`] });
    categoryId = cid;
  }
  const now = nowIso();
  const summary = str(body.summary).slice(0, 500);
  const res = await c.env.DB.prepare(
    "INSERT INTO articles (title, content, summary, cover_image, category_id, author_id, is_top, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)"
  ).bind(title, content, summary, body.cover_image == null ? null : str(body.cover_image), categoryId, user.id, body.is_top ? 1 : 0, now).run();
  const articleId = res.meta.last_row_id;
  return ok201({ id: articleId, title, content, summary, cover_image: body.cover_image ?? null, category: categoryId, is_top: !!body.is_top }, "\u53D1\u5E03\u6210\u529F");
}).put("/articles/:id/edit/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM articles WHERE id = ?1").bind(id).first();
  if (!row) return fail(404, "\u672A\u627E\u5230\u3002");
  const body = await c.req.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : str(row.title);
  const content = typeof body.content === "string" ? body.content : str(row.content);
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 500) : str(row.summary);
  const cover = body.cover_image === null ? null : typeof body.cover_image === "string" && body.cover_image ? body.cover_image : row.cover_image;
  let categoryId = row.category_id;
  if (body.category !== void 0) {
    if (body.category === null) categoryId = null;
    else {
      const cid = Number(body.category);
      const cat = await c.env.DB.prepare("SELECT id FROM categories WHERE id = ?1").bind(cid).first();
      if (!cat) return fail(400, "Invalid input.", { category: [`\u65E0\u6548\u7684\u4E3B\u952E "${body.category}" \u2014\u2014 \u5BF9\u8C61\u4E0D\u5B58\u5728\u3002`] });
      categoryId = cid;
    }
  }
  const isTop = body.is_top === void 0 ? row.is_top : body.is_top ? 1 : 0;
  await c.env.DB.prepare(
    "UPDATE articles SET title = ?1, content = ?2, summary = ?3, cover_image = ?4, category_id = ?5, is_top = ?6, updated_at = ?7 WHERE id = ?8"
  ).bind(title, content, summary, cover, categoryId, isTop, nowIso(), id).run();
  return ok({ id, title, content, summary, cover_image: cover, category: categoryId, is_top: !!isTop }, 200, "\u66F4\u65B0\u6210\u529F");
}).delete("/articles/:id/delete/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const res = await c.env.DB.prepare("DELETE FROM articles WHERE id = ?1").bind(Number(c.req.param("id"))).run();
  if (!res.meta.changes) return fail(404, "\u672A\u627E\u5230\u3002");
  return ok204("\u5220\u9664\u6210\u529F");
}).get("/archives/", async (c) => {
  const rows = await c.env.DB.prepare("SELECT id, title, created_at FROM articles ORDER BY created_at DESC").all();
  const result = [];
  const yearIndex = /* @__PURE__ */ new Map();
  const monthIndex = /* @__PURE__ */ new Map();
  for (const r of rows.results) {
    const d = new Date(str(r.created_at));
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    let yearEntry = yearIndex.get(year);
    if (!yearEntry) {
      yearEntry = { year, months: [] };
      yearIndex.set(year, yearEntry);
      result.push(yearEntry);
    }
    const key = `${year}-${month}`;
    let monthEntry = monthIndex.get(key);
    if (!monthEntry) {
      monthEntry = { month, articles: [] };
      monthIndex.set(key, monthEntry);
      yearEntry.months.push(monthEntry);
    }
    monthEntry.articles.push({ id: r.id, title: r.title, created_at: r.created_at });
  }
  return ok(result);
}).get("/articles/:id/comments/", async (c) => {
  const articleId = Number(c.req.param("id"));
  const tops = await c.env.DB.prepare(
    `SELECT cm.id, cm.article_id, cm.content, cm.parent_id, cm.created_at, u.id AS user_id, u.nickname AS user_nickname, u.username AS user_username, u.avatar AS user_avatar
       FROM comments cm JOIN users u ON u.id = cm.user_id
       WHERE cm.article_id = ?1 AND cm.parent_id IS NULL
       ORDER BY cm.created_at DESC`
  ).bind(articleId).all();
  const serialize = /* @__PURE__ */ __name(async (r, withReplies) => {
    const base = {
      id: r.id,
      article: r.article_id,
      user_id: r.user_id,
      user_name: r.user_nickname,
      user_avatar: r.user_avatar,
      content: r.content,
      parent: r.parent_id,
      created_at: r.created_at
    };
    if (!withReplies) return base;
    const replies = await c.env.DB.prepare(
      `SELECT cm.id, cm.article_id, cm.content, cm.parent_id, cm.created_at, u.id AS user_id, u.nickname AS user_nickname, u.username AS user_username, u.avatar AS user_avatar
         FROM comments cm JOIN users u ON u.id = cm.user_id
         WHERE cm.parent_id = ?1 ORDER BY cm.created_at DESC`
    ).bind(r.id).all();
    const repliesArr = [];
    for (const rep of replies.results) repliesArr.push(await serialize(rep, false));
    base.replies = repliesArr;
    return base;
  }, "serialize");
  const data = [];
  for (const r of tops.results) data.push(await serialize(r, true));
  return ok(data);
}).post("/comments/create/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  const body = await c.req.json().catch(() => ({}));
  const articleId = Number(body.article);
  const content = str(body.content);
  if (!articleId || Number.isNaN(articleId)) return fail(400, "Invalid input.", { article: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  if (!content) return fail(400, "Invalid input.", { content: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  const article = await c.env.DB.prepare("SELECT id FROM articles WHERE id = ?1").bind(articleId).first();
  if (!article) return fail(400, "Invalid input.", { article: [`\u65E0\u6548\u7684\u4E3B\u952E "${body.article}" \u2014\u2014 \u5BF9\u8C61\u4E0D\u5B58\u5728\u3002`] });
  let parentId = null;
  if (body.parent != null) {
    const pid = Number(body.parent);
    const parent = await c.env.DB.prepare("SELECT id FROM comments WHERE id = ?1").bind(pid).first();
    if (!parent) return fail(400, "Invalid input.", { parent: [`\u65E0\u6548\u7684\u4E3B\u952E "${body.parent}" \u2014\u2014 \u5BF9\u8C61\u4E0D\u5B58\u5728\u3002`] });
    parentId = pid;
  }
  const res = await c.env.DB.prepare(
    "INSERT INTO comments (article_id, user_id, content, parent_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5)"
  ).bind(articleId, user.id, content, parentId, nowIso()).run();
  return ok201({ id: res.meta.last_row_id, article: articleId, content, parent: parentId }, "\u8BC4\u8BBA\u6210\u529F");
}).delete("/comments/:id/delete/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT user_id FROM comments WHERE id = ?1").bind(id).first();
  if (!row) return fail(404, "\u672A\u627E\u5230\u3002");
  if (num(row.user_id) !== user.id && !user.is_staff) return fail(403, "\u65E0\u6743\u5220\u9664");
  await c.env.DB.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return ok204("\u5220\u9664\u6210\u529F");
}).post("/articles/:id/like/", async (c) => {
  const id = Number(c.req.param("id"));
  const article = await c.env.DB.prepare("SELECT id FROM articles WHERE id = ?1").bind(id).first();
  if (!article) return fail(404, "\u6587\u7AE0\u4E0D\u5B58\u5728");
  const user = await authUser(c);
  const ip = user ? null : anonIp(c);
  return toggleLike(c.env.DB, "article_likes", "article_id", id, user, ip);
}).post("/talks/:id/like/", async (c) => {
  const id = Number(c.req.param("id"));
  const talk = await c.env.DB.prepare("SELECT id FROM talks WHERE id = ?1").bind(id).first();
  if (!talk) return fail(404, "\u6742\u8C08\u4E0D\u5B58\u5728");
  const user = await authUser(c);
  const ip = user ? null : anonIp(c);
  return toggleLike(c.env.DB, "talk_likes", "talk_id", id, user, ip);
}).get("/talks/", async (c) => {
  const p = pageParams(c);
  const user = await authUser(c);
  const uid = user?.id ?? null;
  const ip = user ? null : anonIp(c);
  const total = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM talks").first();
  const rows = await c.env.DB.prepare(
    `SELECT t.id, t.content, t.created_at, u.nickname AS author_nickname,
        (SELECT COUNT(*) FROM talk_likes tl WHERE tl.talk_id = t.id) AS like_count,
        EXISTS(SELECT 1 FROM talk_likes x WHERE x.talk_id = t.id AND ((?1 IS NOT NULL AND x.user_id = ?1) OR (?1 IS NULL AND ?2 IS NOT NULL AND x.ip_address = ?2))) AS liked
       FROM talks t JOIN users u ON u.id = t.author_id
       ORDER BY t.created_at DESC LIMIT ?3 OFFSET ?4`
  ).bind(uid, ip, p.pageSize, (p.page - 1) * p.pageSize).all();
  const results = rows.results.map((r) => ({
    id: r.id,
    content: r.content,
    author_name: r.author_nickname,
    like_count: r.like_count,
    liked: !!r.liked,
    created_at: r.created_at
  }));
  const url = new URL(c.req.url);
  const query = {};
  url.searchParams.forEach((v, k) => {
    if (k !== "page" && k !== "page_size") query[k] = v;
  });
  return ok(paginated(results, num(total?.n), p, url.pathname, query));
}).post("/talks/create/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const body = await c.req.json().catch(() => ({}));
  const content = str(body.content);
  if (!content) return fail(400, "Invalid input.", { content: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  if (content.length > 500) return fail(400, "Invalid input.", { content: ["\u786E\u4FDD\u8BE5\u5B57\u6BB5\u5305\u542B\u7684\u5B57\u7B26\u4E0D\u8D85\u8FC7 500 \u4E2A\u3002"] });
  const res = await c.env.DB.prepare("INSERT INTO talks (content, author_id, created_at) VALUES (?1, ?2, ?3)").bind(content, user.id, nowIso()).run();
  return ok201(
    { id: res.meta.last_row_id, content, author_name: user.nickname, like_count: 0, liked: false, created_at: nowIso() },
    "\u53D1\u5E03\u6210\u529F"
  );
}).delete("/talks/:id/delete/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const res = await c.env.DB.prepare("DELETE FROM talks WHERE id = ?1").bind(Number(c.req.param("id"))).run();
  if (!res.meta.changes) return fail(404, "\u672A\u627E\u5230\u3002");
  return ok204("\u5220\u9664\u6210\u529F");
}).get("/projects/", async (c) => {
  const rows = await c.env.DB.prepare(
    "SELECT * FROM projects ORDER BY is_featured DESC, sort_order ASC, created_at DESC"
  ).all();
  const data = rows.results.map(projectItem);
  return ok(data);
}).get("/projects/manage/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const rows = await c.env.DB.prepare("SELECT * FROM projects ORDER BY is_featured DESC, sort_order ASC, created_at DESC").all();
  return ok(rows.results.map(projectItem));
}).post("/projects/manage/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const body = await c.req.json().catch(() => ({}));
  const name = str(body.name).trim();
  const description = str(body.description);
  if (!name) return fail(400, "Invalid input.", { name: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  if (!description) return fail(400, "Invalid input.", { description: ["\u8BE5\u5B57\u6BB5\u662F\u5FC5\u586B\u9879\u3002"] });
  const res = await c.env.DB.prepare(
    "INSERT INTO projects (name, description, url, repo_url, tech_stack, cover_image, is_featured, sort_order, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
  ).bind(
    name,
    description,
    str(body.url),
    str(body.repo_url),
    str(body.tech_stack),
    body.cover_image == null ? null : str(body.cover_image),
    body.is_featured ? 1 : 0,
    num(body.order) || num(body.sort_order),
    nowIso()
  ).run();
  const row = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?1").bind(res.meta.last_row_id).first();
  return ok201(projectItem(row), "\u521B\u5EFA\u6210\u529F");
}).put("/projects/manage/:id/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const id = Number(c.req.param("id"));
  const row = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?1").bind(id).first();
  if (!row) return fail(404, "\u672A\u627E\u5230\u3002");
  const body = await c.req.json().catch(() => ({}));
  const merged = {
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : str(row.name),
    description: typeof body.description === "string" ? body.description : str(row.description),
    url: typeof body.url === "string" ? body.url : str(row.url),
    repo_url: typeof body.repo_url === "string" ? body.repo_url : str(row.repo_url),
    tech_stack: typeof body.tech_stack === "string" ? body.tech_stack : str(row.tech_stack),
    cover_image: body.cover_image === null ? null : typeof body.cover_image === "string" && body.cover_image ? body.cover_image : row.cover_image,
    is_featured: body.is_featured === void 0 ? row.is_featured : body.is_featured ? 1 : 0,
    sort_order: body.order !== void 0 ? num(body.order) : body.sort_order !== void 0 ? num(body.sort_order) : num(row.sort_order)
  };
  await c.env.DB.prepare(
    "UPDATE projects SET name=?1, description=?2, url=?3, repo_url=?4, tech_stack=?5, cover_image=?6, is_featured=?7, sort_order=?8 WHERE id=?9"
  ).bind(merged.name, merged.description, merged.url, merged.repo_url, merged.tech_stack, merged.cover_image, merged.is_featured, merged.sort_order, id).run();
  const fresh = await c.env.DB.prepare("SELECT * FROM projects WHERE id = ?1").bind(id).first();
  return ok(projectItem(fresh), 200, "\u66F4\u65B0\u6210\u529F");
}).delete("/projects/manage/:id/", async (c) => {
  const user = await authUser(c);
  if (!user) return fail(401, "\u8EAB\u4EFD\u8BA4\u8BC1\u4FE1\u606F\u672A\u63D0\u4F9B\u3002");
  if (!user.is_staff) return fail(403, "You do not have permission to perform this action.");
  const res = await c.env.DB.prepare("DELETE FROM projects WHERE id = ?1").bind(Number(c.req.param("id"))).run();
  if (!res.meta.changes) return fail(404, "\u672A\u627E\u5230\u3002");
  return ok204("\u5220\u9664\u6210\u529F");
}).get("/stats/", async (c) => {
  const db = c.env.DB;
  const one = /* @__PURE__ */ __name(async (sql) => num((await db.prepare(sql).first())?.n), "one");
  const [articleCount, categoryCount, commentCount, talkCount, projectCount, articleLikeCount, talkLikeCount, userCount, totalViews, firstAt] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM articles"),
    one("SELECT COUNT(*) AS n FROM categories"),
    one("SELECT COUNT(*) AS n FROM comments"),
    one("SELECT COUNT(*) AS n FROM talks"),
    one("SELECT COUNT(*) AS n FROM projects"),
    one("SELECT COUNT(*) AS n FROM article_likes"),
    one("SELECT COUNT(*) AS n FROM talk_likes"),
    one("SELECT COUNT(*) AS n FROM users"),
    one("SELECT COALESCE(SUM(views), 0) AS n FROM articles"),
    db.prepare("SELECT MIN(created_at) AS n FROM articles").first()
  ]);
  let runningDays = 1;
  if (firstAt?.n) {
    const delta = Date.now() - new Date(str(firstAt.n)).getTime();
    runningDays = Math.max(Math.floor(delta / 864e5), 1);
  }
  return ok({
    article_count: articleCount,
    category_count: categoryCount,
    comment_count: commentCount,
    talk_count: talkCount,
    project_count: projectCount,
    article_like_count: articleLikeCount,
    talk_like_count: talkLikeCount,
    total_views: totalViews,
    running_days: runningDays,
    user_count: userCount
  });
});
async function toggleLike(db, table, fk, targetId, user, ip) {
  const existing = user ? await db.prepare(`SELECT id FROM ${table} WHERE ${fk} = ?1 AND user_id = ?2`).bind(targetId, user.id).first() : ip ? await db.prepare(`SELECT id FROM ${table} WHERE ${fk} = ?1 AND ip_address = ?2`).bind(targetId, ip).first() : null;
  if (existing) {
    await db.prepare(`DELETE FROM ${table} WHERE id = ?1`).bind(existing.id).run();
    var liked = false;
  } else {
    await db.prepare(`INSERT INTO ${table} (${fk}, user_id, ip_address, created_at) VALUES (?1, ?2, ?3, ?4)`).bind(targetId, user?.id ?? null, ip, nowIso()).run();
    liked = true;
  }
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${fk} = ?1`).bind(targetId).first();
  return ok({ liked, like_count: num(count?.n) });
}
__name(toggleLike, "toggleLike");
var projectItem = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  name: r.name,
  description: r.description,
  url: r.url,
  repo_url: r.repo_url,
  tech_stack: r.tech_stack,
  tech_list: str(r.tech_stack).split(",").map((t) => t.trim()).filter(Boolean),
  cover_image: r.cover_image,
  is_featured: !!r.is_featured,
  order: r.sort_order,
  created_at: r.created_at
}), "projectItem");

// src/proxy.ts
var LC_GRAPHQL = "https://leetcode.cn/graphql";
var LC_HEADERS = {
  "Content-Type": "application/json",
  Referer: "https://leetcode.cn/",
  Origin: "https://leetcode.cn",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};
var LC_DIFF_MAP = { EASY: "Easy", MEDIUM: "Medium", HARD: "Hard" };
var LC_TOTALS = { EASY: 850, MEDIUM: 1750, HARD: 800 };
async function lcPost(query, variables) {
  try {
    const resp = await fetch(LC_GRAPHQL, {
      method: "POST",
      headers: LC_HEADERS,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(12e3)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
__name(lcPost, "lcPost");
function fallbackCalendar() {
  const cal = {};
  const now = Date.now();
  for (let i = 0; i < 180; i++) {
    const key = new Date(now - i * 864e5).toISOString().slice(0, 10);
    if (i < 7) cal[key] = 1 + Math.floor(Math.random() * 5);
    else if (i < 30) cal[key] = Math.floor(Math.random() * 4);
    else cal[key] = Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0;
  }
  return cal;
}
__name(fallbackCalendar, "fallbackCalendar");
var RECENT_FALLBACK = /* @__PURE__ */ __name(() => {
  const h = 36e5;
  const now = Date.now();
  return [
    { title: "Two Sum", titleSlug: "two-sum", timestamp: Math.floor((now - 2 * h) / 1e3) },
    { title: "Reverse Linked List", titleSlug: "reverse-linked-list", timestamp: Math.floor((now - 24 * h) / 1e3) },
    { title: "Binary Tree Inorder Traversal", titleSlug: "binary-tree-inorder-traversal", timestamp: Math.floor((now - 27 * h) / 1e3) },
    { title: "Valid Parentheses", titleSlug: "valid-parentheses", timestamp: Math.floor((now - 48 * h) / 1e3) },
    { title: "Merge Two Sorted Lists", titleSlug: "merge-two-sorted-lists", timestamp: Math.floor((now - 72 * h) / 1e3) },
    { title: "Maximum Subarray", titleSlug: "maximum-subarray", timestamp: Math.floor((now - 96 * h) / 1e3) }
  ];
}, "RECENT_FALLBACK");
async function fetchLeetcodeLive(userSlug) {
  const progressQuery = `
    query($userSlug: String!) {
      userProfileUserQuestionProgress(userSlug: $userSlug) {
        numAcceptedQuestions { difficulty count }
      }
    }`;
  const progress = await lcPost(progressQuery, { userSlug });
  if (!progress || "errors" in progress) return null;
  const progData = progress.data?.userProfileUserQuestionProgress;
  if (!progData) return null;
  const acList = progData.numAcceptedQuestions ?? [];
  const acSubmissionNum = [];
  const allQuestionsCount = [];
  let totalAc = 0;
  let totalAll = 0;
  for (const key of ["EASY", "MEDIUM", "HARD"]) {
    const ac = acList.find((x) => x.difficulty === key);
    const solved = ac?.count ?? 0;
    totalAc += solved;
    totalAll += LC_TOTALS[key];
    acSubmissionNum.push({ difficulty: LC_DIFF_MAP[key], count: solved });
    allQuestionsCount.push({ difficulty: LC_DIFF_MAP[key], count: LC_TOTALS[key] });
  }
  acSubmissionNum.unshift({ difficulty: "All", count: totalAc });
  allQuestionsCount.unshift({ difficulty: "All", count: totalAll });
  let streak = 0;
  let totalActiveDays = 0;
  let calendar = {};
  try {
    const cal = await lcPost(
      `query($userSlug: String!, $year: Int) {
        userProfileCalendar(userSlug: $userSlug, year: $year) { streak totalActiveDays submissionCalendar }
      }`,
      { userSlug, year: (/* @__PURE__ */ new Date()).getUTCFullYear() }
    );
    const calData = cal?.data?.userProfileCalendar;
    if (calData) {
      streak = calData.streak ?? 0;
      totalActiveDays = calData.totalActiveDays ?? 0;
      if (calData.submissionCalendar) calendar = JSON.parse(calData.submissionCalendar);
    }
  } catch {
  }
  let recentSubmissions = [];
  try {
    const subs = await lcPost(
      `query($userSlug: String!, $limit: Int) {
        recentSubmitList(userSlug: $userSlug, limit: $limit) { title titleSlug submitTime }
      }`,
      { userSlug, limit: 100 }
    );
    const list = subs?.data?.recentSubmitList ?? [];
    recentSubmissions = list.map((s) => ({
      title: s.title ?? "",
      titleSlug: s.titleSlug ?? "",
      timestamp: Number(s.submitTime) || 0
    }));
  } catch {
  }
  if (!Object.keys(calendar).length) calendar = fallbackCalendar();
  if (!recentSubmissions.length) recentSubmissions = RECENT_FALLBACK();
  return {
    profile: {
      matchedUser: {
        submitStatsGlobal: { acSubmissionNum },
        profile: { ranking: 0 }
      },
      allQuestionsCount
    },
    calendar,
    recentSubmissions,
    streak,
    totalActiveDays,
    source: "live"
  };
}
__name(fetchLeetcodeLive, "fetchLeetcodeLive");
var NETEASE_BASE = "https://music.163.com";
var NETEASE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Referer: "https://music.163.com",
  "Content-Type": "application/x-www-form-urlencoded"
};
var PRISDVL_PLAYLIST_ID = 2215753622;
var PRISDVL_UID = 1450284080;
var outerUrl = /* @__PURE__ */ __name((songId) => `${NETEASE_BASE}/song/media/outer/url?id=${songId}.mp3`, "outerUrl");
async function neGet(endpoint, params) {
  try {
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
    const resp = await fetch(`${NETEASE_BASE}${endpoint}?${qs}`, {
      headers: { "User-Agent": NETEASE_HEADERS["User-Agent"], Referer: NETEASE_HEADERS.Referer },
      signal: AbortSignal.timeout(1e4)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
__name(neGet, "neGet");
async function nePost(endpoint, data) {
  try {
    const resp = await fetch(`${NETEASE_BASE}${endpoint}`, {
      method: "POST",
      headers: NETEASE_HEADERS,
      body: new URLSearchParams(data).toString(),
      signal: AbortSignal.timeout(1e4)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}
__name(nePost, "nePost");
async function fetchPlaylistTracks(playlistId, limit) {
  const plData = await neGet("/api/v6/playlist/detail", { id: playlistId, n: 0, s: 0 });
  if (!plData) return null;
  const playlist = plData.playlist ?? {};
  const trackIds = playlist.trackIds ?? [];
  if (!trackIds.length) return null;
  const songLimit = Math.min(limit, trackIds.length);
  const rawTracks = [];
  for (let i = 0; i < songLimit; i += 50) {
    const batch = trackIds.slice(i, i + 50);
    const result = await nePost("/api/v3/song/detail", { c: JSON.stringify(batch.map((t) => ({ id: t.id }))) });
    if (result && Array.isArray(result.songs)) rawTracks.push(...result.songs);
  }
  const mapped = [];
  for (const t of rawTracks) {
    const fee = Number(t.fee ?? 0);
    if (fee === 1 || fee === 4) continue;
    const ar = t.ar ?? t.artists ?? [];
    const al = t.al ?? t.album ?? {};
    mapped.push({
      id: Number(t.id),
      name: String(t.name ?? ""),
      ar: ar.map((a) => ({ name: String(a.name ?? "") })),
      al: { name: String(al.name ?? ""), picUrl: String(al.picUrl ?? "") },
      duration: Number(t.dt ?? t.duration ?? 0)
    });
  }
  return {
    playlist: {
      id: playlistId,
      name: playlist.name ?? "",
      coverImgUrl: playlist.coverImgUrl ?? "",
      trackCount: playlist.trackCount ?? trackIds.length,
      creator: "Prisdvl",
      tracks: mapped
    },
    song_urls: mapped.map((t) => ({ id: t.id, url: outerUrl(t.id) }))
  };
}
__name(fetchPlaylistTracks, "fetchPlaylistTracks");
var neteaseError = /* @__PURE__ */ __name((message, status = 502) => Response.json({ error: message }, { status }), "neteaseError");
var proxyRoutes = new Hono2().get("/leetcode/:username/", async (c) => {
  const username = c.req.param("username");
  const cacheKey = new Request(`https://cache.internal/leetcode/${username}`, c.req.raw);
  const cache = caches.default;
  try {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  } catch {
  }
  const live = await fetchLeetcodeLive(username);
  const payload = live ?? {
    profile: {
      matchedUser: {
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: "All", count: 179 },
            { difficulty: "Easy", count: 65 },
            { difficulty: "Medium", count: 103 },
            { difficulty: "Hard", count: 11 }
          ]
        },
        profile: { ranking: 0 }
      },
      allQuestionsCount: [
        { difficulty: "All", count: 3400 },
        { difficulty: "Easy", count: 850 },
        { difficulty: "Medium", count: 1750 },
        { difficulty: "Hard", count: 800 }
      ]
    },
    calendar: fallbackCalendar(),
    recentSubmissions: RECENT_FALLBACK(),
    streak: 0,
    totalActiveDays: 0,
    source: "fallback"
  };
  const resp = Response.json(payload);
  try {
    const cacheable = resp.clone();
    cacheable.headers.set("Cache-Control", "public, max-age=1800");
    await cache.put(cacheKey, cacheable);
  } catch {
  }
  return resp;
}).get("/netease/playlists/", async (c) => {
  const data = await neGet("/api/user/playlist", { uid: PRISDVL_UID, limit: 50 });
  if (!data) return neteaseError("\u65E0\u6CD5\u8FDE\u63A5\u5230\u7F51\u6613\u4E91 API");
  const playlists = (data.playlist ?? []).map((pl) => ({
    id: pl.id,
    name: pl.name ?? "",
    coverImgUrl: pl.coverImgUrl ?? "",
    trackCount: pl.trackCount ?? 0,
    playCount: pl.playCount ?? 0
  }));
  return Response.json({ playlists });
}).get("/netease/bootstrap/", async (c) => {
  const playlistId = Number(c.req.query("playlist_id")) || PRISDVL_PLAYLIST_ID;
  const limit = Number(c.req.query("limit")) || 100;
  const result = await fetchPlaylistTracks(playlistId, limit);
  if (!result) return neteaseError("\u65E0\u6CD5\u83B7\u53D6\u6B4C\u5355\u6570\u636E");
  return Response.json(result);
}).get("/netease/playlist/:id/", async (c) => {
  const data = await neGet("/api/v6/playlist/detail", { id: Number(c.req.param("id")), n: 0, s: 0 });
  if (!data) return neteaseError("API not available");
  return Response.json(data);
}).get("/netease/playlist/:id/tracks/", async (c) => {
  const limit = Number(c.req.query("limit")) || 100;
  const result = await fetchPlaylistTracks(Number(c.req.param("id")), limit);
  if (!result) return neteaseError("API not available");
  return Response.json(result);
}).get("/netease/song/:id/", (c) => Response.json({ data: [{ id: Number(c.req.param("id")), url: outerUrl(c.req.param("id")) }] })).get("/netease/song/:id/lyric/", async (c) => {
  const data = await neGet("/api/song/lyric", { os: "pc", id: c.req.param("id"), lv: -1, kv: -1, tv: -1 });
  if (!data) return neteaseError("API not available");
  return Response.json(data);
}).get("/netease/search/", async (c) => {
  const keywords = c.req.query("keywords") ?? "";
  const data = await neGet("/api/search/get", { s: keywords, type: 1e3, limit: 10 });
  if (!data) return neteaseError("API not available");
  return Response.json(data);
}).get("/netease/user/:uid/", async (c) => {
  const data = await neGet("/api/user/playlist", { uid: Number(c.req.param("uid")), limit: 30 });
  if (!data) return neteaseError("API not available");
  return Response.json(data);
}).get("/netease/song/:id/stream/", async (c) => {
  const headers = {
    "User-Agent": NETEASE_HEADERS["User-Agent"],
    Referer: NETEASE_HEADERS.Referer
  };
  const range = c.req.header("Range");
  if (range) headers.Range = range;
  let upstream;
  try {
    upstream = await fetch(outerUrl(c.req.param("id")), { headers, redirect: "follow", signal: AbortSignal.timeout(2e4) });
  } catch {
    return neteaseError("\u97F3\u9891\u83B7\u53D6\u5931\u8D25");
  }
  if (upstream.status !== 200 && upstream.status !== 206) return neteaseError("\u97F3\u9891\u4E0D\u53EF\u7528", upstream.status);
  const respHeaders = new Headers();
  respHeaders.set("Content-Type", upstream.headers.get("Content-Type") ?? "audio/mpeg");
  respHeaders.set("Accept-Ranges", "bytes");
  respHeaders.set("Cache-Control", "no-store");
  const contentRange = upstream.headers.get("Content-Range");
  if (contentRange) respHeaders.set("Content-Range", contentRange);
  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) respHeaders.set("Content-Length", contentLength);
  return new Response(upstream.body, { status: upstream.status, headers: respHeaders });
});

// src/ratelimit.ts
var ANON_LIMIT = 120;
var USER_LIMIT = 300;
async function checkRateLimit(c) {
  const user = c.get("authUser");
  const identity = user ? `user:${user.id}` : `ip:${clientIp(c) ?? "unknown"}`;
  const limit = user ? USER_LIMIT : ANON_LIMIT;
  const windowStart = Math.floor(Date.now() / 6e4) * 6e4;
  const key = `${limit === ANON_LIMIT ? "anon" : "user"}|${identity}`;
  const res = await c.env.DB.prepare(
    `INSERT INTO rate_limits (key, window_start, count) VALUES (?1, ?2, 1)
     ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
     RETURNING count`
  ).bind(key, windowStart).first();
  if (Math.random() < 0.01) {
    c.env.DB.prepare("DELETE FROM rate_limits WHERE window_start < ?1").bind(windowStart - 6e5).run().catch(() => {
    });
  }
  if (res && res.count > limit) {
    const waitSec = Math.ceil((windowStart + 6e4 - Date.now()) / 1e3);
    return Response.json(
      { code: 429, message: `Request was throttled. Expected available in ${waitSec} seconds.`, data: null },
      { status: 429 }
    );
  }
  return null;
}
__name(checkRateLimit, "checkRateLimit");

// src/index.ts
var app = new Hono2().basePath("/api/v1");
app.use("*", async (c, next) => {
  const user = await authUser(c);
  if (user) c.set("authUser", user);
  await next();
});
app.use("*", async (c, next) => {
  if (c.req.method === "GET" && /\/netease\/song\/\d+\/stream\/$/.test(c.req.path)) return next();
  const limited = await checkRateLimit(c);
  if (limited) return limited;
  await next();
});
app.route("/", authRoutes);
app.route("/", blogRoutes);
app.route("/", proxyRoutes);
app.notFound((c) => fail(404, "\u672A\u627E\u5230\u3002"));
app.onError((err, c) => {
  console.error("[kakuki] unhandled error:", err);
  return fail(500, "\u670D\u52A1\u5668\u5185\u90E8\u9519\u8BEF");
});
var index_default = app;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
