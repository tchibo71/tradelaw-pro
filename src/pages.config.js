import Dashboard from './pages/Dashboard';
import GenerateQuestions from './pages/GenerateQuestions';
import History from './pages/History';
import Review from './pages/Review';
import Setup from './pages/Setup';
import Study from './pages/Study';


export const PAGES = {
    "Dashboard": Dashboard,
    "GenerateQuestions": GenerateQuestions,
    "History": History,
    "Review": Review,
    "Setup": Setup,
    "Study": Study,
}

export const pagesConfig = {
    mainPage: "Setup",
    Pages: PAGES,
};