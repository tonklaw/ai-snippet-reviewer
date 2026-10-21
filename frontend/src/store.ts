import {
  configureStore,
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
  type ThunkAction,
  type UnknownAction,
} from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import {
  getModels,
  lint,
  type Language,
  type LintResponse,
  type ModelInfo,
} from "./api";
import { applyFix } from "./fixes";
import type { FixStatus } from "./IssueCard";
import { SAMPLES } from "./samples";

// state 
export type ReviewState =
  | { status: "idle" }
  | { status: "loading"; model: string | null; requestId: string }
  | { status: "done"; result: LintResponse; code: string; language: Language }
  | { status: "error"; message: string };

type AppState = {
  language: Language;
  code: string;
  models: ModelInfo[] | null; // null while loading
  model: string | null;
  modelsError: string | null;
  forceReview: boolean;
  review: ReviewState;
  selected: number | null; // clicked issue
  hovered: number | null; // issue under the mouse
  applied: number[]; // issues whose fix was replaced
};

const initialState: AppState = {
  language: "python",
  code: SAMPLES.python,
  models: null,
  model: null,
  modelsError: null,
  forceReview: false,
  review: { status: "idle" },
  selected: null,
  hovered: null,
  applied: [],
};

// async calls
export const loadModels = createAsyncThunk("app/loadModels", (_: void, { signal }) =>
  getModels(signal),
);

export const runReview = createAsyncThunk<
  { result: LintResponse; code: string; language: Language },
  void,
  { state: RootState }
>("app/runReview", async (_, { getState, signal }) => {
  const { language, code, model, forceReview } = getState().app;
  const result = await lint({ language, code, model, forceReview }, signal);
  return { result, code, language };
});

let inFlight: { abort: () => void } | null = null;

export const startReview = (): AppThunk => (dispatch) => {
  inFlight?.abort();
  inFlight = dispatch(runReview());
};

export const cancelReview = (): AppThunk => (dispatch) => {
  inFlight?.abort();
  inFlight = null;
  dispatch(appSlice.actions.reviewCancelled());
};

// reducers
const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    setLanguage(state, action: PayloadAction<Language>) {
      if (state.code === SAMPLES[state.language]) state.code = SAMPLES[action.payload];
      state.language = action.payload;
    },
    setCode(state, action: PayloadAction<string>) {
      state.code = action.payload;
    },
    setModel(state, action: PayloadAction<string>) {
      state.model = action.payload;
    },
    setForceReview(state, action: PayloadAction<boolean>) {
      state.forceReview = action.payload;
    },
    toggleIssue(state, action: PayloadAction<number>) {
      state.selected = state.selected === action.payload ? null : action.payload;
    },
    hoverIssue(state, action: PayloadAction<number | null>) {
      state.hovered = action.payload;
    },
    replaceFix(state, action: PayloadAction<number>) {
      if (state.review.status !== "done") return;
      const fix = state.review.result.issues[action.payload]?.fix;
      const next = fix && applyFix(state.code, state.review.code, fix);
      if (!next) return;
      state.code = next;
      state.applied.push(action.payload);
    },
    reviewCancelled(state) {
      state.review = { status: "idle" };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadModels.fulfilled, (state, action) => {
        state.models = action.payload.models;
        state.model = action.payload.default;
      })
      .addCase(loadModels.rejected, (state, action) => {
        if (!action.meta.aborted) state.modelsError = action.error.message ?? "Failed";
      })
      .addCase(runReview.pending, (state, action) => {
        state.review = { status: "loading", model: state.model, requestId: action.meta.requestId };
        state.selected = null;
        state.hovered = null;
        state.applied = [];
      })
      .addCase(runReview.fulfilled, (state, action) => {
        // ignore answers from a review that was replaced or cancelled
        if (state.review.status !== "loading") return;
        if (state.review.requestId !== action.meta.requestId) return;
        state.review = { status: "done", ...action.payload };
      })
      .addCase(runReview.rejected, (state, action) => {
        if (action.meta.aborted) return;
        if (state.review.status !== "loading") return;
        if (state.review.requestId !== action.meta.requestId) return;
        state.review = { status: "error", message: action.error.message ?? "Review failed" };
      });
  },
});

export const {
  setLanguage,
  setCode,
  setModel,
  setForceReview,
  toggleIssue,
  hoverIssue,
  replaceFix,
} = appSlice.actions;

// selectors
const selectApp = (state: RootState) => state.app;

export const selectStale = (state: RootState) =>
  state.app.review.status === "done" && state.app.review.code !== state.app.code;

export const selectCanReview = (state: RootState) =>
  state.app.model !== null && state.app.code.trim() !== "";

export const selectHighlights = createSelector([selectApp, selectStale], (app, stale) =>
  app.review.status === "done" && !stale
    ? app.review.result.issues.map((i) => ({ from: i.startLine, to: i.endLine }))
    : [],
);

// hovering previews an issue like a click; only a click scrolls the editor
export const selectActive = (state: RootState) => {
  const index = state.app.hovered ?? state.app.selected;
  return index === null ? null : (selectHighlights(state)[index] ?? null);
};

export const selectScrollTo = (state: RootState) =>
  state.app.selected === null ? null : (selectHighlights(state)[state.app.selected] ?? null);

export const selectFixStatus = createSelector([selectApp], (app): FixStatus[] => {
  if (app.review.status !== "done") return [];
  const { review } = app;
  return review.result.issues.map((issue, i) => {
    if (app.applied.includes(i)) return "applied";
    if (!issue.fix) return "blocked";
    return applyFix(app.code, review.code, issue.fix) === null ? "blocked" : "ready";
  });
});

// store
export const store = configureStore({
  reducer: { app: appSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
type AppThunk = ThunkAction<void, RootState, unknown, UnknownAction>;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
