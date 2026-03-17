import React, { createContext, useContext, useReducer, ReactNode } from "react";
import type { City, Teacher, Course } from "./api-client";

// 预约流程步骤
export type BookingStep = 1 | 2 | 3 | 4;

// 预约状态
interface BookingState {
  currentStep: BookingStep;
  selectedCity: City | null;
  selectedDate: Date | null;
  selectedTimeSlot: string | null;
  selectedTeacher: Teacher | null;
  selectedCourse: Course | null;
}

// Action类型
type BookingAction =
  | { type: "SET_STEP"; step: BookingStep }
  | { type: "SELECT_CITY"; city: City }
  | { type: "SELECT_DATE"; date: Date }
  | { type: "SELECT_TIME_SLOT"; timeSlot: string }
  | { type: "SELECT_TEACHER"; teacher: Teacher }
  | { type: "SELECT_COURSE"; course: Course }
  | { type: "RESET" }
  | { type: "GO_BACK" };

// 初始状态
const initialState: BookingState = {
  currentStep: 1,
  selectedCity: null,
  selectedDate: null,
  selectedTimeSlot: null,
  selectedTeacher: null,
  selectedCourse: null,
};

// Reducer
function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    
    case "SELECT_CITY":
      return {
        ...state,
        selectedCity: action.city,
        currentStep: 2,
      };
    
    case "SELECT_DATE":
      return {
        ...state,
        selectedDate: action.date,
      };
    
    case "SELECT_TIME_SLOT":
      return {
        ...state,
        selectedTimeSlot: action.timeSlot,
        currentStep: state.selectedDate ? 3 : state.currentStep,
      };
    
    case "SELECT_TEACHER":
      return {
        ...state,
        selectedTeacher: action.teacher,
        currentStep: 4,
      };
    
    case "SELECT_COURSE":
      return {
        ...state,
        selectedCourse: action.course,
      };
    
    case "GO_BACK":
      if (state.currentStep > 1) {
        return {
          ...state,
          currentStep: (state.currentStep - 1) as BookingStep,
        };
      }
      return state;
    
    case "RESET":
      return initialState;
    
    default:
      return state;
  }
}

// Context
interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
  // 便捷方法
  selectCity: (city: City) => void;
  selectDate: (date: Date) => void;
  selectTimeSlot: (timeSlot: string) => void;
  selectTeacher: (teacher: Teacher) => void;
  selectCourse: (course: Course) => void;
  goBack: () => void;
  reset: () => void;
  canProceedToTeacher: () => boolean;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

// Provider
export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  const selectCity = (city: City) => {
    dispatch({ type: "SELECT_CITY", city });
  };

  const selectDate = (date: Date) => {
    dispatch({ type: "SELECT_DATE", date });
  };

  const selectTimeSlot = (timeSlot: string) => {
    dispatch({ type: "SELECT_TIME_SLOT", timeSlot });
  };

  const selectTeacher = (teacher: Teacher) => {
    dispatch({ type: "SELECT_TEACHER", teacher });
  };

  const selectCourse = (course: Course) => {
    dispatch({ type: "SELECT_COURSE", course });
  };

  const goBack = () => {
    dispatch({ type: "GO_BACK" });
  };

  const reset = () => {
    dispatch({ type: "RESET" });
  };

  const canProceedToTeacher = () => {
    return state.selectedDate !== null && state.selectedTimeSlot !== null;
  };

  return (
    <BookingContext.Provider
      value={{
        state,
        dispatch,
        selectCity,
        selectDate,
        selectTimeSlot,
        selectTeacher,
        selectCourse,
        goBack,
        reset,
        canProceedToTeacher,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

// Hook
export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within a BookingProvider");
  }
  return context;
}

// 步骤配置
export const BOOKING_STEPS = [
  { id: 1, title: "选城市" },
  { id: 2, title: "选时间" },
  { id: 3, title: "选老师" },
  { id: 4, title: "选课程" },
] as const;
