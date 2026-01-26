import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Study from './pages/Study';
import Review from './pages/Review';
import History from './pages/History';
import GenerateQuestions from './pages/GenerateQuestions';


export const PAGES = {
    "Setup": Setup,
    "Dashboard": Dashboard,
    "Study": Study,
    "Review": Review,
    "History": History,
    "GenerateQuestions": GenerateQuestions,
}

export const pagesConfig = {
    mainPage: "Setup",
    Pages: PAGES,
};