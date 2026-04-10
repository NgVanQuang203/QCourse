/**
 * FSRS v5 Spaced Repetition Algorithm
 * Based on the Free Spaced Repetition Scheduler (FSRS)
 * Reference: https://github.com/open-spaced-repetition/fsrs4anki
 */

export enum State {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export enum Rating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

export interface FSRSState {
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: State;
  lastReview?: Date;
  nextDueDate: Date;
}

// Default Weights for FSRS v5
const W = [
  0.4025, 1.4612, 3.3705, 13.2563, 
  5.385, 0.8467, 0.8624, 0.0016, 
  0.6551, 1.9831, 0.2871, 0.8037, 
  0.1707, 0.3276, 1.7259, 0.4217, 
  19.1641
];

const REQUEST_RETENTION = 0.9;
const DECAY = -0.7;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1;

export function initFSRSState(): FSRSState {
  return {
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    nextDueDate: new Date(),
  };
}

export function calculateFSRS(state: FSRSState, rating: Rating, now: Date = new Date()): FSRSState {
  const newState = { ...state };
  const elapsedDays = state.lastReview 
    ? Math.max(0, (now.getTime() - state.lastReview.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  newState.elapsedDays = elapsedDays;
  newState.lastReview = now;
  newState.reps += 1;

  if (state.state === State.New) {
    newState.difficulty = W[4] - (rating - 1) * W[5];
    newState.stability = W[rating - 1];
    newState.state = rating === Rating.Easy ? State.Review : State.Learning;
  } else if (state.state === State.Learning || state.state === State.Relearning) {
    if (rating === Rating.Again) {
      newState.stability = W[0] / 4; // Penalty for failure in learning
    } else if (rating === Rating.Hard) {
      newState.stability = W[1] / 2;
    } else if (rating === Rating.Good) {
      newState.stability = W[2];
    } else if (rating === Rating.Easy) {
      newState.stability = W[3];
      newState.state = State.Review;
    }
  } else { // Review state
    const retrievability = Math.pow(1 + FACTOR * elapsedDays / state.stability, DECAY);
    
    // Update difficulty
    newState.difficulty = state.difficulty - W[6] * (rating - 3);
    newState.difficulty = Math.min(Math.max(newState.difficulty, 1), 10);
    
    if (rating === Rating.Again) {
      newState.lapses += 1;
      newState.stability = W[11] * Math.pow(state.difficulty, -W[12]) * (Math.pow(state.stability + 1, W[13]) - 1) * Math.exp((1 - retrievability) * W[14]);
      newState.state = State.Relearning;
    } else {
      const bonus = rating === Rating.Hard ? W[15] : rating === Rating.Easy ? W[16] : 1;
      newState.stability = state.stability * (1 + Math.exp(W[8]) * (11 - newState.difficulty) * Math.pow(newState.stability, -W[9]) * (Math.exp((1 - retrievability) * W[10]) - 1) * bonus);
    }
  }

  // Calculate next interval
  // interval = s / factor * (retention^(1/decay) - 1)
  let intervalDays = newState.stability / FACTOR * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
  
  // Caps and minimums
  if (newState.state === State.Learning || newState.state === State.Relearning) {
    // Standard FSRS learning steps: Again=1m, Hard=5m, Good=10m, Easy=1d
    if (rating === Rating.Again) {
      intervalDays = 1 / (24 * 60); // 1 minute
    } else if (rating === Rating.Hard) {
      intervalDays = 5 / (24 * 60); // 5 minutes
    } else if (rating === Rating.Good) {
      intervalDays = 10 / (24 * 60); // 10 minutes
    } else if (rating === Rating.Easy) {
      intervalDays = 1; // 1 day
    }
  } else {
    // Review state follows stability-based interval
    intervalDays = Math.max(1, Math.min(intervalDays, 36500)); 
  }

  // Ensure precision for small intervals (minutes)
  newState.scheduledDays = Number(intervalDays.toFixed(6));
  newState.nextDueDate = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

  return newState;
}

/**
 * Predict next intervals for a card for the UI buttons
 */
export function predictFSRS(state: FSRSState, now: Date = new Date()) {
  return {
    again: calculateFSRS(state, Rating.Again, now),
    hard: calculateFSRS(state, Rating.Hard, now),
    good: calculateFSRS(state, Rating.Good, now),
    easy: calculateFSRS(state, Rating.Easy, now),
  };
}

export function formatInterval(days: number): string {
  if (days < 1 / (24 * 60)) return "< 1m";
  if (days < 1 / 24) {
    const mins = Math.round(days * 24 * 60);
    return `${mins}m`;
  }
  if (days < 1) {
    const hrs = Math.round(days * 24);
    return `${hrs}h`;
  }
  if (days < 30) {
    const d = Math.round(days);
    return `${d}d`;
  }
  if (days < 365) {
    const m = Math.round(days / 30);
    return `${m}mo`;
  }
  return `${Math.round(days / 365)}y`;
}
