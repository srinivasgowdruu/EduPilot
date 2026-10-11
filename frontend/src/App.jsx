import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/useAuth'; // Import useAuth
import LoginPage from './pages/LoginPage'; // Import Login page
import RegisterPage from './pages/RegisterPage'; // Import Register page
import MenuIcon from '@mui/icons-material/Menu'; // Sandwich icon
import AccountCircle from '@mui/icons-material/AccountCircle'; // User icon
import ChatIcon from '@mui/icons-material/Chat'; // Icon for chatbot FAB
import QuizIcon from '@mui/icons-material/Quiz'; // Icon for Generate Quiz
import FlashOnIcon from '@mui/icons-material/FlashOn'; // Icon for Generate Flashcards
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // Icon for Download PDF
import ChatBubbleOutlineRoundedIcon from '@mui/icons-material/ChatBubbleOutlineRounded';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Container,
  CssBaseline,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  Fab,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  InputBase,
  LinearProgress,
  Link,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { ArrowBackIos, ArrowForwardIos } from '@mui/icons-material';
// Date and Icons
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DeleteIcon from '@mui/icons-material/Delete';
import EventNoteIcon from '@mui/icons-material/EventNote';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SendIcon from '@mui/icons-material/Send';
import AddIcon from '@mui/icons-material/Add';

// Date formatting
import { format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'; // For "New Chat" button

// Markdown
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Carousel
import Slider from "react-slick"; // Import react-slick for carousel
import "slick-carousel/slick/slick.css"; // Import slick carousel styles
import "slick-carousel/slick/slick-theme.css"; // Import slick carousel theme

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth(); // Get auth status from context

  // While the AuthContext is initially checking the token, show a loading indicator
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If the initial check is done and the user is NOT authenticated...
  if (!isAuthenticated) {
    // ...redirect them to the login page.
    // `replace` prevents the user from going back to the protected route via the browser's back button.
    return <Navigate to="/login" replace />;
  }

  // If the initial check is done and the user IS authenticated...
  // ...render the child components that were passed into ProtectedRoute.
  // This will be your main application UI.
  return children;
}


export default function App() {
  // --- State Variables ---
  const [topic, setTopic] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const [generatedNotes, setGeneratedNotes] = useState("");
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState('');
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Loading for main content
  const [error, setError] = useState(null); // Error for main content fetch

  // --- Quiz State ---
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [quizDifficulty, setQuizDifficulty] = useState('medium'); // Default difficulty
  const [quizAnswers, setQuizAnswers] = useState([]); // Store user's answers for review
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [weakTopicAnalysis, setWeakTopicAnalysis] = useState(null);
  const [weakTopicLoading, setWeakTopicLoading] = useState(false);
  const [weakTopicError, setWeakTopicError] = useState(null);
  const [studyRecommendations, setStudyRecommendations] = useState([]); // Store study recommendations
  const [quizIsLoading, setQuizIsLoading] = useState(false); // Loading for quiz generation
  const [, setQuizError] = useState(null); // Error for quiz generation

  // --- PDF State ---
  const [pdfIsLoading, setPdfIsLoading] = useState(false); // Loading for PDF generation
  const [, setPdfError] = useState(null); // Error for PDF generation

  // --- Flashcard State ---
  const [flashcards, setFlashcards] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false); // Track if definition side is shown
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const [, setFlashcardsError] = useState(null);

  // --- Study Planner State ---
  const [studyPlanEntries, setStudyPlanEntries] = useState([]);
  const [newPlanDate, setNewPlanDate] = useState(null); // Store date object from picker
  const [planDuration, setPlanDuration] = useState(60);
  const [planStudyMinutes, setPlanStudyMinutes] = useState(25);
  const [planBreakMinutes, setPlanBreakMinutes] = useState(5);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);

  // --- Chatbot State ---
  const [chatHistory, setChatHistory] = useState([]); // Array of { sender: 'user'|'ai', text: '...' }
  const [chatInput, setChatInput] = useState('');
  const [chatIsLoading, setChatIsLoading] = useState(false); // Loading AI response
  const [chatError, setChatError] = useState(null);
  const chatMessagesEndRef = useRef(null); // Ref for auto-scrolling

  // --- Auth Hook & Navigation ---
  const { isAuthenticated, user, logout, isLoading: authIsLoading, apiClient } = useAuth(); // Add apiClient here
  const navigate = useNavigate(); // For programmatic navigation

   // Add state for the user menu in the AppBar
   const [anchorEl, setAnchorEl] = useState(null);
   const handleMenu = (event) => { setAnchorEl(event.currentTarget); };
   const handleClose = () => { setAnchorEl(null); };
   const handleLogout = () => {
     logout(); // Call logout from AuthContext
     handleClose(); // Close the menu
     navigate('/login'); // Redirect to login page
   };

   // --- Sidebar/History State ---
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sessionHistory, setSessionHistory] = useState([]); // List of {id, topic, created_at}
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null); // ID of the currently loaded session

  // State for controlling the Study Planner modal
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const handleOpenPlanner = () => setIsPlannerOpen(true);
  const handleClosePlanner = () => setIsPlannerOpen(false);

  // State for controlling the Chatbot modal
  const [isChatOpen, setIsChatOpen] = useState(false);
  const handleOpenChat = () => setIsChatOpen(true);
  const handleCloseChat = () => setIsChatOpen(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    // This effect runs after the component mounts and when isAuthenticated changes.
    // This is mainly a fallback or for re-initialization if the AppBar re-renders.
    // The primary initialization should happen via the onload callback in index.html.
    if (isAuthenticated && window.google && window.google.translate && typeof window.googleTranslateElementInit === 'function') {
      // Check if the div exists and is empty (widget not rendered inside yet)
      const translateElement = document.getElementById('google_translate_element');
      if (translateElement && translateElement.innerHTML.trim() === '') {
        // console.log("React useEffect: Triggering googleTranslateElementInit as target div is empty."); // Debug log
        window.googleTranslateElementInit();
      }
    }
  }, [isAuthenticated, authIsLoading]);

  // --- Handler Functions ---
  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (!file) {
      setError(null);
    }
  };

  const uploadFile = async () => {
    if (!selectedFile) return;

    setUploadingFile(true);
    setError(null);
    setGeneratedNotes('');
    setQuizQuestions([]);
    setFlashcards([]);
    setChatHistory([]);
    setCurrentSessionId(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await apiClient.post('/upload-file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedTopic = response.data.topic || selectedFile.name;
      const uploadedNotes = response.data.notes || '';
      const uploadedSummary = response.data.summary || '';
      console.log('UPLOAD NOTES:', uploadedNotes);
      console.log('UPLOAD SUMMARY:', uploadedSummary);
      setTopic(uploadedTopic);
      setGeneratedNotes(uploadedNotes);
      setNotes(uploadedNotes);
      setSummary(uploadedSummary);
      setVideos([]);
      setCurrentSessionId(response.data.session_id || null);
      setError(null);
      fetchSessionHistory();
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.error || 'Failed to upload and analyze the file.');
    } finally {
      setUploadingFile(false);
    }
  };

  // Inside App component function:
  const fetchStudyPlan = useCallback(async () => { // Wrap with useCallback
    // Make sure apiClient is listed as a dependency if used inside
    if (!isAuthenticated) return; // Check auth state inside if needed
    setPlanLoading(true);
    setPlanError(null);
    try {
        const response = await apiClient.get('/study-plan'); // Use apiClient
        setStudyPlanEntries(response.data || []);
    } catch (err) {
        console.error("Error fetching study plan:", err);
        setPlanError(err.response?.data?.error || err.message || "Failed to fetch study plan.");
    } finally { setPlanLoading(false); }
  }, [isAuthenticated, apiClient]); // Dependencies of fetchStudyPlan

  const fetchSessionHistory = useCallback(async () => { // Wrap with useCallback
      if (!isAuthenticated) return;
      setHistoryLoading(true);
      setHistoryError(null);
      try {
          const response = await apiClient.get('/sessions'); // Use apiClient
          setSessionHistory(response.data || []);
      } catch (err) {
          console.error("Error fetching session history:", err);
          setHistoryError(err.response?.data?.error || err.message || "Failed to fetch session history.");
      } finally { setHistoryLoading(false); }
  }, [isAuthenticated, apiClient]); // Dependencies of fetchSessionHistory

  const toggleDrawer = (open) => (event) => {
    if (event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    setDrawerOpen(open);
  };

  // Load a specific session's data
  const loadSession = async (sessionId) => {
  if (!sessionId) return;
  console.log("Loading session:", sessionId);
  setIsLoading(true); // Use main loading indicator
  setError(null);
  setDrawerOpen(false); // Close drawer after selection

  // Clear potentially stale data from previous session first
  setNotes(''); setSummary(''); setVideos([]); setQuizQuestions([]); setFlashcards([]); setChatHistory([]); // Clear chat too
  setQuizCompleted(false); setQuizError(null); setFlashcardsError(null); setPdfError(null); setChatError(null); // Clear errors

  try {
      const response = await apiClient.get(`/sessions/${sessionId}`);
      const sessionData = response.data;

      // Update main state with loaded data
      setTopic(sessionData.topic || '');
      setGeneratedNotes(sessionData.notes || '');
      setNotes(sessionData.notes || '');
      setSummary(sessionData.summary || '');
      setVideos(sessionData.videos || []);
      setQuizQuestions(sessionData.quizQuestions || []);
      setFlashcards(sessionData.flashcards || []);
      setCurrentSessionId(sessionData.id); // Track the loaded session ID

      // Reset quiz/flashcard generation states if loading existing ones
      // (User might want to regenerate later)

  } catch (err) {
      console.error(`Error loading session ${sessionId}:`, err);
      setError(err.response?.data?.error || err.message || "Failed to load session.");
      setCurrentSessionId(null); // Reset session ID on error
  } finally {
      setIsLoading(false);
  }
  };

  // Delete a session
  const handleDeleteSession = async (sessionId, event) => {
    event.stopPropagation(); // Prevent triggering loadSession when clicking delete icon
    if (!sessionId) return;
    console.log("Deleting session:", sessionId);
    // Optionally add a confirmation dialog here
    // setHistoryLoading(true); // Can use history loading state

    try {
        await apiClient.delete(`/sessions/${sessionId}`);
        // Refresh history after deletion
        fetchSessionHistory();
        // If the deleted session was the currently loaded one, clear the main view
        if (currentSessionId === sessionId) {
            handleNewSession(); // Use handleNewSession to clear view
        }
    } catch (err) {
        console.error(`Error deleting session ${sessionId}:`, err);
        setHistoryError(err.response?.data?.error || err.message || "Failed to delete session.");
        // setHistoryLoading(false);
    }
  };

  // Function to clear the current view and prepare for new input
  const handleNewSession = useCallback(() => {
    setTopic('');
    setNotes('');
    setSummary('');
    setVideos([]);
    setQuizQuestions([]);
    setFlashcards([]);
    setChatHistory([]);
    setCurrentSessionId(null); // Important: No active session loaded
    // Clear errors
    setError(null);
    setQuizError(null);
    setFlashcardsError(null);
    setPdfError(null);
    setChatError(null);
    setPlanError(null); // Clear planner error too
    // Close drawer if open
    setDrawerOpen(false);
  }, [setTopic, setNotes, setSummary, setVideos, setQuizQuestions, setFlashcards, setChatHistory, setCurrentSessionId, setError, setQuizError, setFlashcardsError, setPdfError, setChatError, setPlanError, setDrawerOpen]);

  const handleGetContent = () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
  
    setIsLoading(true);
    setError(null);
  
    // Clear content for a "new" session feel
    handleNewSession(); // Resets everything except topic
    setIsLoading(true); // handleNewSession sets loading false, so set it true again
  
    apiClient.post('/get-content', { topic: topic })
      .then(response => {
        const { session_id, topic: resTopic, notes, summary, videos } = response.data;
  
        setTopic(resTopic || topic); // Update topic if backend modified it
        setNotes(notes || "No notes generated.");
        setSummary(summary || "No summary generated.");
        setVideos(videos || []);
        setCurrentSessionId(session_id); // Store new session ID
  
        // Update session history with new session
        fetchSessionHistory();
      })
      .catch(err => {
        console.error("Error fetching data:", err);
        const errorMsg = err.response?.data?.error || err.message || "Failed to fetch content.";
        setError(errorMsg);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };
  
  const fetchQuizDifficulty = async () => {
    try {
      const response = await apiClient.get('/quiz-difficulty');

      const difficulty = response.data?.difficulty || 'medium';

      setQuizDifficulty(difficulty);

      return difficulty;
    } catch (error) {
      console.error("Failed to determine quiz difficulty:", error);

      // If something goes wrong, use normal difficulty
      setQuizDifficulty('medium');

      return 'medium';
    }
  };

  const handleGenerateQuiz = async() => {
    const notesToUse = notes || generatedNotes || '';
    if (!notesToUse) {
      setQuizError("Cannot generate quiz without notes.");
      return;
    }
  
    setQuizIsLoading(true);
    setQuizError(null);
    setQuizQuestions([]);
    setQuizCompleted(false);
    setCurrentQuestionIndex(0);
    setScore(0);
    setQuizAnswers([]); // Clear previous answers
    setWeakTopicAnalysis(null); // Clear previous weak-topic analysis
    setWeakTopicError(null);
    setSelectedAnswer('');
    setShowFeedback(false);
  
    const difficulty = await fetchQuizDifficulty();

    console.log("Adaptive quiz difficulty:", difficulty);

    apiClient.post('/generate-quiz', {
      notes: notesToUse,
      session_id: currentSessionId,
      difficulty: difficulty
    })
      .then(response => {
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setQuizQuestions(response.data);
        } else {
          console.error("Invalid quiz data received:", response.data);
          setQuizError("Received empty or invalid quiz data from backend.");
          setQuizQuestions([]);
        }
      })
      .catch(err => {
        console.error("Error generating quiz:", err);
        const errorMsg = err.response?.data?.error || err.message || "Failed to generate quiz.";
        setQuizError(errorMsg);
        if (err.response?.data?.raw_response_snippet) {
          console.error("Raw response snippet from backend:", err.response.data.raw_response_snippet);
        }
      })
      .finally(() => {
        setQuizIsLoading(false);
      });
  };
  

  // Handle selecting a quiz answer
  const handleAnswerChange = (event) => {
    setSelectedAnswer(event.target.value);
  };

  // Handle submitting a quiz answer
  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return;

    const currentQuestion = quizQuestions[currentQuestionIndex];

    if (!currentQuestion) return;

    const isCorrect =
      selectedAnswer === currentQuestion.correct_answer;

    // Update score
    if (isCorrect) {
      setScore(prevScore => prevScore + 1);
    }

    // Save this question's answer
    setQuizAnswers(prevAnswers => [
      ...prevAnswers,
      {
        question: currentQuestion.question,
        selected_answer: selectedAnswer,
        correct_answer: currentQuestion.correct_answer,
        is_correct: isCorrect
      }
    ]);

    setShowFeedback(true);
  };

  // Save completed quiz result to backend
  const saveQuizAttempt = async (finalScore) => {
    if (!currentSessionId || quizQuestions.length === 0) {
      console.warn("Cannot save quiz attempt: missing session or questions.");
      return;
    }

    try {
      await apiClient.post('/quiz-attempt', {
        session_id: currentSessionId,
        score: finalScore,
        total_questions: quizQuestions.length,
        difficulty: 'medium',
        answers: quizAnswers // Send the user's answers for review
      });

      console.log("Quiz attempt saved successfully.");

      //Analyze recent performance after saving the attempt
      await fetchWeakTopicAnalysis();

    } catch (error) {
      console.error("Failed to save quiz attempt:", error);
    }
  };

  const fetchWeakTopicAnalysis = async () => {
    setWeakTopicLoading(true);
    setWeakTopicError(null);

    try {
      const response = await apiClient.get('/weak-topics');

      setWeakTopicAnalysis(response.data);

      const recommendations = response.data?.weak_topics?.map((item) => ({
        topic: item.topic,
        priority: item.priority,
        recommendation: item.reason
        ? `Focus on ${item.topic}: ${item.reason}`
        : `Review ${item.topic} and practice it again with another quiz.`
      })) || [];

      setStudyRecommendations(recommendations);
    } catch (error) {
      console.error("Failed to fetch weak-topic analysis:", error);

      setWeakTopicError(
        error.response?.data?.error ||
        "Failed to analyze your quiz performance."
      );
    } finally {
      setWeakTopicLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    setShowFeedback(false);

    if (currentQuestionIndex < quizQuestions.length - 1) {
      setSelectedAnswer('');
      setCurrentQuestionIndex(prevIndex => prevIndex + 1);
    } else {
      // The last answer has already been counted
      // inside handleSubmitAnswer.
      const finalScore = score;

      setQuizCompleted(true);

      // Save the already-calculated score
      await saveQuizAttempt(finalScore);

      setSelectedAnswer('');
    }
  };

  // Handle retaking/clearing the quiz
  // const handleRetakeQuiz = () => {
  //   setQuizQuestions([]);
  //   setQuizCompleted(false);
  //   setCurrentQuestionIndex(0);
  //   setScore(0);
  //   setSelectedAnswer('');
  //   setShowFeedback(false);
  //   setQuizError(null);
  //   // Decide if you want to auto-regenerate or just clear
  //   // handleGenerateQuiz(); // Uncomment to immediately regenerate
  // };

  const handleRegenerateQuiz = async() => {
    const notesToUse = notes || generatedNotes || '';
    if (!notesToUse || !currentSessionId) { // Ensure notes and a session context exist
        setQuizError("Cannot regenerate quiz without loaded notes and an active session.");
        return;
    }
    console.log("Regenerating quiz for session:", currentSessionId);

    // Set loading states and clear previous quiz specific states
    setQuizIsLoading(true);
    setQuizError(null);
    setQuizQuestions([]); // Clear existing questions before fetching new ones
    setCurrentQuestionIndex(0);
    setSelectedAnswer('');
    setScore(0);
    setWeakTopicAnalysis(null);
    setWeakTopicError(null);
    setShowFeedback(false);
    setQuizCompleted(false);

    const difficulty = await fetchQuizDifficulty();

    const response = await apiClient.post('/generate-quiz', {
      notes: notesToUse,
      session_id: currentSessionId,
      difficulty: difficulty
    })
    .then(response => {
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
            setQuizQuestions(response.data);
        } else {
            console.error("Invalid quiz data received on regenerate:", response.data);
            setQuizError("Received empty or invalid new quiz data from backend.");
            setQuizQuestions([]);
        }
    })
    .catch(err => {
        console.error("Error regenerating quiz:", err);
        const errorMsg = err.response?.data?.error || err.message || "Failed to regenerate quiz.";
        setQuizError(errorMsg);
        if(err.response?.data?.raw_response_snippet) {
          console.error("Raw response snippet from backend:", err.response.data.raw_response_snippet);
        }
    })
    .finally(() => {
        setQuizIsLoading(false);
    });
};

  // Handle PDF Download
  const handleDownloadPdf = () => {
    if (!notes) {
      setPdfError("Notes must be generated before downloading PDF.");
      return;
    }
    setPdfIsLoading(true);
    setPdfError(null);
    const pdfData = {
      topic: topic || 'Study Notes',
      notes: notes,
      quizQuestions: quizQuestions // Send quiz data (backend will handle Q&A extraction)
    };

    axios.post('http://127.0.0.1:5000/api/generate-pdf', pdfData, {
      responseType: 'blob', // Expect binary file data
    })
      .then(response => {
        const file = new Blob([response.data], { type: 'application/pdf' });
        const fileURL = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = fileURL;

        const contentDisposition = response.headers['content-disposition'];
        let filename = `${(topic || 'study').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_notes.pdf`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileURL);
      })
      .catch(async (error) => { // Make catch async
        console.error('Error downloading PDF:', error);
        let errorMsg = "Failed to download PDF.";
        // Try reading error from blob if backend sent JSON error
        if (error.response && error.response.data instanceof Blob && error.response.data.type.includes('json')) {
          try {
            const errorJsonText = await error.response.data.text();
            const errorJson = JSON.parse(errorJsonText);
            errorMsg = errorJson.error || errorMsg;
            console.error("Backend PDF Error:", errorJson);
          } catch (parseError) {
            console.error("Failed to parse error response blob:", parseError);
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        setPdfError(errorMsg);
      })
      .finally(() => {
        setPdfIsLoading(false);
      });
  };

  const handleGenerateFlashcards = () => {
    const notesToUse = notes || generatedNotes || '';
    if (!notesToUse) {
      setFlashcardsError("Cannot generate flashcards without notes.");
      return;
    }
  
    setFlashcardsLoading(true);
    setFlashcardsError(null);
    setFlashcards([]); // Clear previous flashcards
    setCurrentCardIndex(0);
    setIsFlipped(false);
  
    apiClient.post('/generate-flashcards', {
      notes: notesToUse,
      session_id: currentSessionId // Send current session ID
    })
      .then(response => {
        if (response.data && Array.isArray(response.data)) {
          setFlashcards(response.data);
          if (response.data.length === 0) {
            setFlashcardsError("No key terms found for flashcards.");
          }
        } else {
          console.error("Invalid flashcard data received:", response.data);
          setFlashcardsError("Received invalid flashcard data from backend.");
          setFlashcards([]);
        }
      })
      .catch(err => {
        console.error("Error generating flashcards:", err);
        const errorMsg = err.response?.data?.error || err.message || "Failed to generate flashcards.";
        setFlashcardsError(errorMsg);
        if (err.response?.data?.raw_response_snippet) {
          console.error("Raw response snippet from backend:", err.response.data.raw_response_snippet);
        }
      })
      .finally(() => {
        setFlashcardsLoading(false);
      });
  };
  

  // Implement Flashcard Navigation/Flip Handlers:
  const handleFlipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNextCard = () => {
    if (currentCardIndex < flashcards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false); // Show term side first on new card
    }
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(currentCardIndex - 1);
      setIsFlipped(false); // Show term side first on new card
    }
  };

  // Implement Flashcard Download Handler:
  const handleDownloadFlashcards = () => {
    if (!flashcards || flashcards.length === 0) {
      setFlashcardsError("No flashcards available to download.");
      return;
    }
    // Consider adding a loading state specific to download if needed
    setFlashcardsError(null);

    axios.post('http://127.0.0.1:5000/api/download-flashcards',
      {
        flashcards: flashcards, // Send the array of flashcards
        topic: topic || 'flashcards' // Send topic for filename
      },
      { responseType: 'blob' } // Expect blob for file download
    )
      .then(response => {
        const file = new Blob([response.data], { type: 'text/csv;charset=utf-8;' }); // Specify charset
        const fileURL = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = fileURL;

        const contentDisposition = response.headers['content-disposition'];
        let filename = `${(topic || 'flashcards').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`;
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(fileURL);
      })
      .catch(async (error) => { // Async catch for potential blob reading
        console.error('Error downloading flashcards CSV:', error);
        let errorMsg = "Failed to download flashcards CSV.";
        if (error.response && error.response.data instanceof Blob) {
          try { // Try reading blob as text, might contain JSON error from backend
            const errorText = await error.response.data.text();
            try { // Try parsing as JSON
              const errorJson = JSON.parse(errorText);
              errorMsg = errorJson.error || errorMsg;
              console.error("Backend CSV Download Error:", errorJson);
            } catch { // If not JSON, use the text directly
              errorMsg = errorText.substring(0, 100) || errorMsg; // Show snippet
              console.error("Backend CSV Download Error (non-JSON):", errorText);
            }
          } catch (readError) {
            console.error("Failed to read error response blob:", readError);
          }
        } else if (error.message) {
          errorMsg = error.message;
        }
        setFlashcardsError(errorMsg);
      });
  };

  // --- Study Planner Handlers ---

  // Add a new entry
  const handleAddPlanEntry = () => {
    if (!topic || !newPlanDate) {
        setPlanError("Please ensure a topic is loaded and select a review date.");
        return;
    }
    if (planDuration <= 0 || planStudyMinutes <= 0) {
        setPlanError("Please enter a valid plan duration and study block length.");
        return;
    }
    setPlanLoading(true);
    setPlanError(null);

    const formattedDate = format(newPlanDate, 'yyyy-MM-dd');

    apiClient.post('/study-plan', {
      topic: topic,
      review_date: formattedDate,
      total_minutes: planDuration,
      study_minutes: planStudyMinutes,
      break_minutes: planBreakMinutes
    })
    .then(() => {
        fetchStudyPlan();
        setNewPlanDate(null);
        setPlanDuration(60);
        setPlanStudyMinutes(25);
        setPlanBreakMinutes(5);
    })
    .catch(err => {
      console.error("Error adding study plan entry:", err);
      if (err.toJSON) { console.error("Full Axios error details:", err.toJSON()); }
      else { console.error("Full error object:", err); }
      setPlanError(err.response?.data?.error || err.message || "Failed to add entry.");
      setPlanLoading(false);
    });
  };

  // Delete an entry
  const handleDeletePlanEntry = (id) => {
    setPlanLoading(true); // Indicate loading for delete operation
    setPlanError(null);
    apiClient.delete(`/study-plan/${id}`)
        .then(() => {
            fetchStudyPlan(); // Refetch the list after deletion
        })
        .catch(err => {
          console.error("Error deleting study plan entry:", err);
          if (err.toJSON) { console.error("Full Axios error details:", err.toJSON()); }
          else { console.error("Full error object:", err); }
            setPlanError(err.response?.data?.error || err.message || "Failed to delete entry.");
            setPlanLoading(false); // Ensure loading is false on error
        });
  };

  // --- useEffect to fetch data and clear state on auth change ---
// In App.jsx
useEffect(() => {
  if (isAuthenticated) {
     console.log("Authenticated, fetching user-specific data..."); // Add log
     fetchStudyPlan();
     fetchSessionHistory();
  } else {
     console.log("Not authenticated, clearing data..."); // Add log
     setStudyPlanEntries([]);
     setSessionHistory([]);
     handleNewSession();
  }
}, [isAuthenticated, fetchStudyPlan, fetchSessionHistory, handleNewSession]); // Ensure all dependencies are here


  // --- Chatbot Handlers ---

  const handleChatInputChange = (event) => {
    setChatInput(event.target.value);
  };

  const handleSendChatMessage = () => {
    const messageText = chatInput.trim();
    if (!messageText || chatIsLoading) {
        return; // Don't send empty messages or while loading
    }

    // Add user message to history
    const newUserMessage = { sender: 'user', text: messageText };
    setChatHistory(prev => [...prev, newUserMessage]);
    setChatInput(''); // Clear input field
    setChatIsLoading(true);
    setChatError(null);

    // Send message and context to backend
    apiClient.post('/chat', {
      message: messageText,
      context: notes // Send the current notes as context
  })
    .then(response => {
        const aiResponseText = response.data?.response || "Sorry, I couldn't get a response.";
        const newAiMessage = { sender: 'ai', text: aiResponseText };
        setChatHistory(prev => [...prev, newAiMessage]);
    })
    .catch(err => {
      console.error("Error sending chat message:", err);
      if (err.toJSON) { console.error("Full Axios error details:", err.toJSON()); }
      else { console.error("Full error object:", err); }
        const errorMsg = err.response?.data?.error || err.message || "Failed to get chat response.";
        setChatError(errorMsg);
        // Optionally add an error message to chat history
        setChatHistory(prev => [...prev, { sender: 'ai', text: `Error: ${errorMsg}` }]);
    })
    .finally(() => {
        setChatIsLoading(false);
    });
  };

  // --- useEffect for Auto-Scrolling Chat ---
  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]); // Scroll whenever chatHistory changes

// --- JSX Rendering with Routing & Sidebar ---
return (
  <React.Fragment>
    <CssBaseline />
    
    {/* =================== AppBar =================== */}
    {/* Show AppBar only if authenticated and initial auth check is done */}
    {!authIsLoading && isAuthenticated && (
        <AppBar
          position="static"
          sx={{
            mb: 2,
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(37, 117, 252, 0.14)',
            boxShadow: '0 4px 24px rgba(31, 41, 55, 0.06)',
            color: '#1e293b',
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: { xs: 60, md: 68 },
              px: { xs: 1.5, md: 3 },
              gap: 1,
            }}
          >
            {/* Menu button to open the Drawer */}
            <IconButton
              size="large"
              edge="start"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{
                mr: 1.5,
                width: 44,
                height: 44,
                borderRadius: '14px',
                color: '#2575fc',
                background: 'rgba(37, 117, 252, 0.07)',
                border: '1px solid rgba(37, 117, 252, 0.10)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  background: 'rgba(37, 117, 252, 0.14)',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
            <Typography
              variant="h6"
              component="div"
              sx={{
                flexGrow: 1,
                fontWeight: 700,
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                letterSpacing: '1.2px',
                background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                cursor: 'default',
              }}
            >
              EDUPILOT
            </Typography>
            {/* --- Google Translate Element Placeholder --- */}
            <Box
              id="google_translate_element"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                minHeight: 38,
                px: 1.5,
                borderRadius: '12px',
                background: 'rgba(37, 117, 252, 0.06)',
                border: '1px solid rgba(37, 117, 252, 0.12)',
                transition: 'all 0.25s ease',
                '&:hover': {
                  background: 'rgba(37, 117, 252, 0.10)',
                  borderColor: 'rgba(37, 117, 252, 0.25)',
                },
                '& select': {
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#4f46e5',
                  cursor: 'pointer',
                },
              }}
            />
            {/* --- End Google Translate Element Placeholder --- */}
            {/* User Menu */}
            
              <div>
                <IconButton
                  size="large"
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    color: '#6a11cb',
                    background: 'rgba(106, 17, 203, 0.06)',
                    border: '1px solid rgba(106, 17, 203, 0.10)',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      background: 'rgba(106, 17, 203, 0.12)',
                      transform: 'scale(1.05)',
                    },
                  }}
                >
                  <AccountCircle />
                </IconButton>
                {user && (
                <Menu
                  id="menu-appbar"
                  anchorEl={anchorEl}
                  anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                  keepMounted
                  transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                  open={Boolean(anchorEl)}
                  onClose={handleClose}
                >
                  <MenuItem disabled>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      Logged in as: {user.username}
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                      Logout
                    </Typography>
                  </MenuItem>
                </Menu>
              )}
              </div>
          </Toolbar>
        </AppBar>
    )}
    {/* ================= End AppBar ================= */}


    {/* =================== Sidebar Drawer =================== */}
    {/* Render Drawer only when authenticated */}
    {isAuthenticated && (
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={toggleDrawer(false)} // Close drawer on clicking outside or pressing Esc
          sx={{
            '& .MuiDrawer-paper': {
              width: 280,
              background: '#ffffff', // Translucent purple background
              backdropFilter: 'blur(10px)', // Add blur effect
              color: '#1976d2', // Default text color
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
            },
          }}
        >
          <Box
            sx={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
            }}
            role="presentation"
            onKeyDown={toggleDrawer(false)} // Close on Esc
          >
            {/* Spacer to push content below AppBar */}
            <Toolbar />
            {/* Button to start a new session */}
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AddCircleOutlineIcon />}
                onClick={handleNewSession} // Clears the main view
                fullWidth
                sx={{
                  mb: 2,
                  borderRadius: '20px',
                  background: '#1976d2',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
                  '&:hover': {
                    background: '#1565c0',
                  },
                }}
              >
                New Chat / Topic
              </Button>
            </Box>
            <Divider sx={{ mb: 2, borderColor: 'rgba(255, 255, 255, 0.3)' }} />
            {/* History List Area */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 2 }}>
              {historyLoading && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2, color: '#ffffff' }} />}
              {historyError && <Alert severity="error" sx={{ m: 1, backgroundColor: '#f44336', color: '#ffffff' }}>{historyError}</Alert>}
              <List>
                {/* Map over sessionHistory state */}
                {sessionHistory.map((session) => (
                  <ListItem
                    key={session.id}
                    disablePadding
                    sx={{
                      mb: 1,
                      borderRadius: '10px',
                      background: currentSessionId === session.id
                        ? 'rgba(255, 255, 255, 0.2)' // Highlight selected session
                        : 'transparent',
                      color: currentSessionId === session.id ? '#1976d2' : '#333333', // Adjust text color
                      transition: 'background 0.3s ease, color 0.3s ease',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                      },
                    }}
                  >
                    <ListItemButton
                      onClick={() => loadSession(session.id)}
                      sx={{
                        borderRadius: '10px',
                        py: 1,
                        px: 2,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 'auto', mr: 1.5, color: 'inherit' }}>
                        <HistoryIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={session.topic}
                        primaryTypographyProps={{
                          noWrap: true,
                          variant: 'body2',
                          fontWeight: 'bold',
                        }}
                        secondary={new Date(session.created_at).toLocaleDateString()}
                        secondaryTypographyProps={{
                          variant: 'caption',
                          color: 'inherit',
                        }}
                      />
                      {/* Delete Button */}
                      <ListItemSecondaryAction>
                        <Tooltip title="Delete Session">
                          <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            size="small"
                            sx={{
                              color: '#f44336',
                              '&:hover': {
                                color: '#d32f2f',
                              },
                            }}
                          >
                            <DeleteForeverIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          </Box>
        </Drawer>
    )}
    {/* ================= End Sidebar Drawer ================= */}


    {/* =================== Routing =================== */}
    <Routes>
      {/* --- Public Routes --- */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* --- Protected Main App Route --- */}
      <Route
        path="/"
        element={
          <ProtectedRoute> {/* Guards the content below */}

            {/* START: Your Existing Main Application UI */}
            {/* This Container holds ALL the content generation, quiz, pdf, etc. */}
            <Container maxWidth="lg">
              <Box sx={{ my: isAuthenticated ? 2 : 4 }}> {/* Adjust margin */}

                {/* =================== Modern EduPilot Learning Hub =================== */}
                <Box
                  sx={{
                    minHeight: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: { xs: 2, md: 4 },
                    py: { xs: 3, md: 4 },
                    background:
                      'radial-gradient(circle at 15% 20%, rgba(37,117,252,0.10), transparent 30%), radial-gradient(circle at 85% 80%, rgba(106,17,203,0.10), transparent 30%)',
                    borderRadius: '28px',
                  }}
                >
                  <Box sx={{ width: '100%', maxWidth: 1050 }}>

                    {/* Hero Heading */}
                    <Box sx={{ textAlign: 'center', mb: 5 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: '2rem', md: '3.2rem' },
                          fontWeight: 800,
                          lineHeight: 1.15,
                          letterSpacing: '-1.5px',
                          color: '#172033',
                        }}
                      >
                        What do you want to{' '}
                        <Box
                          component="span"
                          sx={{
                            background:
                              'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          learn today?
                        </Box>
                      </Typography>

                      <Typography
                        sx={{
                          mt: 2,
                          fontSize: { xs: '0.95rem', md: '1.1rem' },
                          color: '#667085',
                          maxWidth: 650,
                          mx: 'auto',
                          lineHeight: 1.7,
                        }}
                      >
                        Turn any topic or study material into focused,
                        personalized learning with EduPilot.
                      </Typography>
                    </Box>

                    {/* Topic Generator Card */}
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: '22px',
                        background: 'rgba(255,255,255,0.88)',
                        border: '1px solid rgba(37,117,252,0.12)',
                        boxShadow: '0 18px 50px rgba(31, 41, 55, 0.08)',
                        backdropFilter: 'blur(14px)',
                      }}
                    >
                      <Box sx={{ mb: 2.5 }}>
                        <Typography
                          sx={{
                            fontSize: { xs: '1.1rem', md: '1.25rem' },
                            fontWeight: 700,
                            color: '#172033',
                          }}
                        >
                          Start a new learning session
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.5,
                            fontSize: '0.9rem',
                            color: '#667085',
                          }}
                        >
                          Enter a topic or upload your own study material to get started.
                        </Typography>
                      </Box>

                      {/* YOUR EXISTING BOX — KEEP THIS */}
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 1.5,
                          flexDirection: { xs: 'column', md: 'row' },
                        }}
                      >
                        <TextField
                          fullWidth
                          placeholder="Enter a topic you want to learn..."
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          disabled={isLoading}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !isLoading) {
                              handleGetContent();
                            }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '15px',
                              background: '#f8fafc',
                              minHeight: 58,
                              '& fieldset': {
                                borderColor: '#e2e8f0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#2575fc',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#2575fc',
                              },
                            },
                          }}
                        />

                        <Button
                          variant="contained"
                          onClick={handleGetContent}
                          disabled={isLoading}
                          sx={{
                            minWidth: { xs: '100%', md: 170 },
                            minHeight: 58,
                            borderRadius: '15px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            background:
                              'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                            boxShadow: '0 8px 20px rgba(37,117,252,0.25)',
                            '&:hover': {
                              background:
                                'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                            },
                          }}
                        >
                          {isLoading ? (
                            <CircularProgress size={24} color="inherit" />
                          ) : (
                            'Generate Learning'
                          )}
                        </Button>
                      </Box>

                      {/* Divider */}
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          my: 3,
                        }}
                      >
                        <Box sx={{ flex: 1, height: '1px', bgcolor: '#e5e7eb' }} />

                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: '#98a2b3',
                          }}
                        >
                          OR
                        </Typography>

                        <Box sx={{ flex: 1, height: '1px', bgcolor: '#e5e7eb' }} />
                      </Box>

                      {/* Document Upload */}
                      <Box
                        sx={{
                          border: '1.5px dashed #cbd5e1',
                          borderRadius: '18px',
                          p: { xs: 2.5, md: 3 },
                          textAlign: 'center',
                          background: '#f8fafc',
                        }}
                      >
                        <Typography
                          sx={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: '#1e293b',
                          }}
                        >
                          Study from your own material
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.7,
                            mb: 2,
                            fontSize: '0.85rem',
                            color: '#64748b',
                          }}
                        >
                          Upload PDF, DOC, DOCX or TXT and let EduPilot analyze it.
                        </Typography>

                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: 1.5,
                            flexWrap: 'wrap',
                          }}
                        >
                          <Button
                            variant="outlined"
                            component="label"
                            sx={{
                              borderRadius: '12px',
                              px: 3,
                              textTransform: 'none',
                              fontWeight: 600,
                              borderColor: '#2575fc',
                              color: '#2575fc',
                              '&:hover': {
                                borderColor: '#1d65df',
                                background: 'rgba(37,117,252,0.05)',
                              },
                            }}
                          >
                            Upload Document
                            <input
                              hidden
                              type="file"
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={handleFileChange}
                            />
                          </Button>

                          <Button
                            variant="contained"
                            onClick={uploadFile}
                            disabled={!selectedFile || uploadingFile}
                            sx={{
                              borderRadius: '12px',
                              px: 3,
                              textTransform: 'none',
                              fontWeight: 600,
                              background:
                                'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                              '&:hover': {
                                background:
                                  'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                              },
                            }}
                          >
                            {uploadingFile ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : (
                              'Analyze Material'
                            )}
                          </Button>
                        </Box>

                        {selectedFile && (
                          <Typography
                            sx={{
                              mt: 2,
                              fontSize: '0.8rem',
                              color: '#475467',
                              fontWeight: 500,
                            }}
                          >
                            Selected: {selectedFile.name}
                          </Typography>
                        )}
                      </Box>
                    </Paper>


                  </Box>
                </Box>
                {/* ================= End Modern EduPilot Learning Hub ================= */}

                {generatedNotes && (
                  <Box sx={{ mt: 4 }}>
                    <Typography
                      sx={{
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        color: '#172033',
                        mb: 1.5,
                      }}
                    >
                      Short Notes
                    </Typography>

                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: '18px',
                        background: 'rgba(255,255,255,0.88)',
                        border: '1px solid rgba(37,117,252,0.12)',
                        boxShadow: '0 12px 35px rgba(31,41,55,0.07)',
                        color: '#344054',
                        lineHeight: 1.7,
                        whiteSpace: 'pre-wrap',
                        overflowX: 'auto',
                      }}
                    >
                      {generatedNotes}
                    </Paper>
                  </Box>
                )}

                {/* Loading Indicator */}
                {isLoading && ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box> )}
                {/* Error Display */}
                {error && ( <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> )}

                {/* --- Main Content Display Area + Actions --- */}
                {!isLoading && (notes || summary || videos.length > 0) && (
                  <Box sx={{ mt: 2 }}>
                    {/* Grid for Notes/Summary/Videos */}
                    <Grid container spacing={4}>
                      {notes && (
                        <Grid item xs={12} md={8}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.2,
                              mb: 2,
                            }}
                          >
                            <Box
                              sx={{
                                width: 5,
                                height: 28,
                                borderRadius: '10px',
                                background: 'linear-gradient(180deg, #2575fc 0%, #6a11cb 100%)',
                              }}
                            />

                            <Typography
                              variant="h5"
                              component="h2"
                              sx={{
                                fontWeight: 800,
                                color: '#172033',
                                letterSpacing: '-0.5px',
                              }}
                            >
                              Study Notes
                            </Typography>
                          </Box>
                          <Box
                            sx={{
                            p: { xs: 2.5, md: 3.5 },
                            background: 'rgba(255,255,255,0.92)',
                            borderRadius: '18px',
                            border: '1px solid rgba(37,117,252,0.10)',
                            boxShadow: '0 12px 35px rgba(31,41,55,0.07)',
                            maxHeight: '60vh',
                            overflowY: 'auto',

                            '& h1, & h2, & h3': {
                              color: '#172033',
                              fontWeight: 800,
                              marginTop: '1.2em',
                              marginBottom: '0.6em',
                            },

                            '& p': {
                              color: '#475467',
                              lineHeight: 1.75,
                              fontSize: '0.98rem',
                            },

                            '& li': {
                              color: '#475467',
                              lineHeight: 1.7,
                              marginBottom: '0.35rem',
                            },

                            '& strong': {
                              color: '#172033',
                            },

                            '& pre': {
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                            },
                          }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{notes}</ReactMarkdown>
                          </Box>
                        </Grid>
                      )}
                      {summary && (
                        <Box sx={{ mb: 3 }}>
                          <Typography
                            sx={{
                              fontSize: { xs: '1.3rem', md: '1.5rem' },
                              fontWeight: 800,
                              color: '#172033',
                              mb: 1.5,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                            }}
                          >
                            <Box
                              component="span"
                              sx={{
                                width: 4,
                                height: 26,
                                borderRadius: '4px',
                                background:
                                  'linear-gradient(180deg, #2575fc 0%, #6a11cb 100%)',
                              }}
                            />
                            Summary
                          </Typography>

                          <Box
                            sx={{
                              p: { xs: 2.5, md: 3 },
                              background:
                                'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(245,248,255,0.96) 100%)',
                              borderRadius: '18px',
                              border: '1px solid rgba(37,117,252,0.12)',
                              boxShadow: '0 10px 30px rgba(31,41,55,0.07)',
                              maxHeight: '25vh',
                              overflowY: 'auto',

                              '&::-webkit-scrollbar': {
                                width: '6px',
                              },
                              '&::-webkit-scrollbar-thumb': {
                                background: '#c7d2fe',
                                borderRadius: '10px',
                              },

                              '& p': {
                                marginTop: 0,
                                marginBottom: '12px',
                                color: '#475467',
                                fontSize: '0.95rem',
                                lineHeight: 1.7,
                              },

                              '& pre': {
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              },

                              '& strong': {
                                color: '#172033',
                              },
                            }}
                          >
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {summary}
                            </ReactMarkdown>
                          </Box>
                        </Box>
                      )}
                          {videos.length > 0 && (
                            <Box
                              sx={{
                                width: '100%',
                                maxWidth: '100%',
                                boxSizing: 'border-box',
                                mt: 3,
                                mx: 0,
                              }}
                            >
                              <Typography
                                component="h3"
                                sx={{
                                  fontSize: { xs: '1.2rem', md: '1.45rem' },
                                  fontWeight: 800,
                                  color: '#172033',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-start',
                                  gap: 1,
                                  mb: 3,
                                  '&::before': {
                                    content: '""',
                                    width: '5px',
                                    height: '26px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(180deg, #2575fc 0%, #6a11cb 100%)',
                                  },
                                }}
                              >
                                Related YouTube Videos
                              </Typography>
                              <Box
                                sx={{
                                  position: 'relative',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1.5,
                                  px: { xs: 1, md: 2 },
                                  py: 1.5,
                                  borderRadius: '22px',
                                  background:
                                    'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(245,248,255,0.96) 100%)',
                                  border: '1px solid rgba(37,117,252,0.12)',
                                  boxShadow: '0 12px 35px rgba(31,41,55,0.07)',
                                }}
                              >
                                {/* Left Arrow Button */}
                                <IconButton
                                  onClick={() => {
                                    scrollRef.current.scrollBy({ left: -300, behavior: 'smooth' });
                                  }}
                                  sx={{
                                    position: 'absolute',
                                    left: 0,
                                    zIndex: 1,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    color: '#fff',
                                    '&:hover': {
                                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    },
                                  }}
                                >
                                  <ArrowBackIos />
                                </IconButton>

                                {/* Scrollable Container */}
                                <Box
                                  ref={scrollRef}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    alignItems: 'stretch',
                                    width: '100%',
                                    minWidth: 0,
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    overflowX: 'auto',
                                    overflowY: 'hidden',
                                    gap: 2,
                                    p: 2,
                                    scrollBehavior: 'smooth',
                                    WebkitOverflowScrolling: 'touch',
                                    '&::-webkit-scrollbar': {
                                      height: '6px',
                                    },
                                    '&::-webkit-scrollbar-thumb': {
                                      background: '#b8c7e6',
                                      borderRadius: '10px',
                                    },
                                    '&::-webkit-scrollbar-thumb:hover': {
                                      background: '#829bd0',
                                    },
                                  }}
                                >
                                  {videos.map((video) => (
                                    <Box
                                      key={video.id || video.url}
                                      sx={{
                                        minWidth: { xs: 260, sm: 300 },
                                        maxWidth: 320,
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'stretch',
                                        overflow: 'hidden',
                                        background: 'linear-gradient(145deg, #ffffff 0%, #f5f8ff 100%)',
                                        borderRadius: '18px',
                                        border: '1px solid rgba(37, 117, 252, 0.12)',
                                        boxShadow: '0 8px 24px rgba(31, 41, 55, 0.07)',
                                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                        '&:hover': {
                                          transform: 'translateY(-5px)',
                                          boxShadow: '0 16px 32px rgba(37, 117, 252, 0.16)',
                                          borderColor: 'rgba(37, 117, 252, 0.28)',
                                        },
                                      }}
                                    >
                                      <Box
                                        sx={{
                                          width: '100%',
                                          height: { xs: 170, sm: 185 },
                                          overflow: 'hidden',
                                          borderRadius: 0,
                                          mb: 1.5,
                                          background: '#eaf0ff',
                                        }}
                                      >
                                        <CardMedia
                                          component="img"
                                          sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                          }}
                                          image={video.thumbnail}
                                          alt={video.title}
                                        />
                                      </Box>
                                      <Typography
                                        component="div"
                                        variant="body2"
                                        title={video.title}
                                        sx={{
                                          px: 2,
                                          pb: 2,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          display: '-webkit-box',
                                          WebkitLineClamp: 2,
                                          WebkitBoxOrient: 'vertical',
                                          lineHeight: 1.5,
                                          minHeight: '3em',
                                          fontSize: '0.95rem',
                                          fontWeight: 700,
                                          color: '#172033',
                                          textAlign: 'left',
                                          width: '100%',

                                        }}
                                      >
                                        <Link
                                          href={video.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          underline="hover"
                                          sx={{
                                            color: '#1E88E5',
                                            '&:hover': {
                                              color: '#1565C0',
                                            },
                                          }}
                                        >
                                          {video.title}
                                        </Link>
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>

                                {/* Right Arrow Button */}
                                <IconButton
                                  onClick={() => {
                                    scrollRef.current.scrollBy({ left: 300, behavior: 'smooth' });
                                  }}
                                  sx={{
                                    position: 'absolute',
                                    right: 0,
                                    zIndex: 1,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    color: '#fff',
                                    '&:hover': {
                                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                    },
                                  }}
                                >
                                  <ArrowForwardIos />
                                </IconButton>
                              </Box>
                            </Box>
                          )}
                        
                      
                    </Grid>
                  </Box>
                )}

                {/* Floating Action Buttons for Content Actions */}
                {isAuthenticated && notes && (
                  <Box
                    sx={{
                    position: 'fixed',
                    top: '50%',
                    right: { xs: 10, md: 20 },
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.5,
                    borderRadius: '26px',
                    background: 'rgba(255, 255, 255, 0.97)',
                    border: '1px solid rgba(37, 117, 252, 0.12)',
                    boxShadow: '0 12px 35px rgba(31, 41, 55, 0.12)',
                    backdropFilter: 'blur(14px)',
                    zIndex: 1000,
                  }}
                  >
                    {/* Generate Quiz Button */}
                    <Tooltip title="Generate Quiz" arrow>
                      <Fab
                        color="secondary"
                        aria-label="generate-quiz"
                        onClick={handleGenerateQuiz}
                        disabled={isLoading || quizIsLoading}
                        sx={{
                          width: 58,
                          height: 58,
                          minHeight: 58,
                          borderRadius: '20px',
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 8px 24px rgba(37, 117, 252, 0.30)',
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                            transform: 'translateY(-3px) scale(1.04)',
                            boxShadow: '0 12px 30px rgba(37, 117, 252, 0.40)',
                          },
                          '&.Mui-disabled': {
                            color: '#ffffff',
                            background: '#cbd5e1',
                          },
                        }}
                      >
                        {quizIsLoading ? <CircularProgress size={24} color="inherit" /> : <QuizIcon sx={{ fontSize: 26 }}/>}
                      </Fab>
                    </Tooltip>

                    {/* Generate Flashcards Button */}
                    <Tooltip title="Generate Flashcards" arrow>
                      <Fab
                        color="success"
                        aria-label="generate-flashcards"
                        onClick={handleGenerateFlashcards}
                        disabled={isLoading || flashcardsLoading}
                        sx={{
                          width: 58,
                          height: 58,
                          minHeight: 58,
                          borderRadius: '20px',
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 8px 24px rgba(37, 117, 252, 0.30)',
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                            transform: 'translateY(-3px) scale(1.04)',
                            boxShadow: '0 12px 30px rgba(37, 117, 252, 0.40)',
                          },
                          '&.Mui-disabled': {
                            color: '#ffffff',
                            background: '#cbd5e1',
                          },
                        }}
                      >
                        {flashcardsLoading ? <CircularProgress size={24} color="inherit" /> : <FlashOnIcon sx={{ fontSize: 26 }}/>}
                      </Fab>
                    </Tooltip>

                    {/* Download PDF Button */}
                    <Tooltip title="Download PDF" arrow>
                      <Fab
                        color="primary"
                        aria-label="download-pdf"
                        onClick={handleDownloadPdf}
                        disabled={isLoading || pdfIsLoading}
                        sx={{
                          width: 58,
                          height: 58,
                          minHeight: 58,
                          borderRadius: '20px',
                          color: '#ffffff',
                          background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: '0 8px 24px rgba(37, 117, 252, 0.30)',
                          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                            transform: 'translateY(-3px) scale(1.04)',
                            boxShadow: '0 12px 30px rgba(37, 117, 252, 0.40)',
                          },
                          '&.Mui-disabled': {
                            color: '#ffffff',
                            background: '#cbd5e1',
                          },
                        }}
                      >
                        {pdfIsLoading ? <CircularProgress size={24} color="inherit" /> : <PictureAsPdfIcon sx={{ fontSize: 26 }}/>}
                      </Fab>
                    </Tooltip>
                  </Box>
                )}

                {/* Quiz Area */}
                {quizQuestions.length > 0 && !quizCompleted && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 4 },
                      mt: 4,
                      borderRadius: '22px',
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(245,248,255,0.96) 100%)',
                      border: '1px solid rgba(37,117,252,0.12)',
                      boxShadow: '0 18px 50px rgba(31,41,55,0.08)',
                    }}
                  >
                    {/* Quiz Header */}
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                      <Typography
                        sx={{
                          fontSize: { xs: '1.5rem', md: '1.8rem' },
                          fontWeight: 800,
                          color: '#172033',
                        }}
                      >
                        Quiz Time
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.6,
                          fontSize: '0.9rem',
                          color: '#667085',
                        }}
                      >
                        Question {currentQuestionIndex + 1} of {quizQuestions.length}
                      </Typography>
                    </Box>

                    {/* Progress */}
                    <Box sx={{ mb: 4 }}>
                      <LinearProgress
                        variant="determinate"
                        value={
                          ((currentQuestionIndex + 1) / quizQuestions.length) * 100
                        }
                        sx={{
                          height: 8,
                          borderRadius: '10px',
                          backgroundColor: '#e8eefc',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: '10px',
                            background:
                              'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)',
                          },
                        }}
                      />
                    </Box>

                    {/* Question */}
                    <Box
                      sx={{
                        p: { xs: 2, md: 3 },
                        mb: 3,
                        borderRadius: '16px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: '1rem', md: '1.15rem' },
                          fontWeight: 700,
                          color: '#172033',
                          lineHeight: 1.6,
                        }}
                      >
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {quizQuestions[currentQuestionIndex]?.question || ''}
                        </ReactMarkdown>
                      </Typography>
                    </Box>

                    {/* Answer Options */}
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <FormLabel
                        component="legend"
                        sx={{
                          mb: 1.5,
                          fontSize: '0.9rem',
                          fontWeight: 700,
                          color: '#475467',
                        }}
                      >
                        Choose your answer
                      </FormLabel>

                      <RadioGroup
                        aria-label="quiz-options"
                        name="quiz-options-group"
                        value={selectedAnswer}
                        onChange={handleAnswerChange}
                      >
                        {(quizQuestions[currentQuestionIndex]?.options || []).map(
                          (option, index) => (
                            <Box
                              key={index}
                              sx={{
                                mb: 1.2,
                                borderRadius: '14px',
                                border:
                                  selectedAnswer === option
                                    ? '2px solid #2575fc'
                                    : '1px solid #e2e8f0',
                                background:
                                  selectedAnswer === option
                                    ? 'rgba(37,117,252,0.06)'
                                    : '#ffffff',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: '#2575fc',
                                  background: 'rgba(37,117,252,0.04)',
                                },
                              }}
                            >
                              <FormControlLabel
                                value={option}
                                control={
                                  <Radio
                                    sx={{
                                      color: '#94a3b8',
                                      '&.Mui-checked': {
                                        color: '#2575fc',
                                      },
                                    }}
                                  />
                                }
                                label={
                                  <Box
                                    sx={{
                                      py: 1.3,
                                      pr: 2,
                                      width: '100%',
                                    }}
                                  >
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                      {option}
                                    </ReactMarkdown>
                                  </Box>
                                }
                                disabled={showFeedback}
                                sx={{
                                  m: 0,
                                  width: '100%',
                                  alignItems: 'center',
                                  '& .MuiFormControlLabel-label': {
                                    width: '100%',
                                    fontSize: '0.95rem',
                                    color: '#344054',
                                  },
                                }}
                              />
                            </Box>
                          )
                        )}
                      </RadioGroup>
                    </FormControl>

                    {/* Feedback */}
                    {showFeedback && (
                      <Alert
                        severity={
                          selectedAnswer ===
                          quizQuestions[currentQuestionIndex]?.correct_answer
                            ? 'success'
                            : 'error'
                        }
                        sx={{
                          mt: 3,
                          borderRadius: '14px',
                          '& .MuiAlert-message': {
                            width: '100%',
                          },
                        }}
                      >
                        <Typography sx={{ fontWeight: 700 }}>
                          {selectedAnswer ===
                          quizQuestions[currentQuestionIndex]?.correct_answer
                            ? 'Correct!'
                            : 'Incorrect.'}
                        </Typography>

                        <Typography variant="body2" sx={{ mt: 1, lineHeight: 1.6 }}>
                          <strong>Explanation:</strong>
                        </Typography>

                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {quizQuestions[currentQuestionIndex]?.explanation || ''}
                        </ReactMarkdown>
                      </Alert>
                    )}

                    {/* Actions */}
                    <Box
                      sx={{
                        mt: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 2,
                        flexDirection: { xs: 'column', sm: 'row' },
                      }}
                    >
                      <Button
                        variant="contained"
                        onClick={handleSubmitAnswer}
                        disabled={!selectedAnswer || showFeedback}
                        sx={{
                          minHeight: 48,
                          px: 3,
                          borderRadius: '13px',
                          textTransform: 'none',
                          fontWeight: 700,
                          background:
                            'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          boxShadow: '0 8px 20px rgba(37,117,252,0.20)',
                          '&:hover': {
                            background:
                              'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                          },
                        }}
                      >
                        Submit Answer
                      </Button>

                      <Button
                        variant="contained"
                        onClick={handleNextQuestion}
                        disabled={!showFeedback}
                        sx={{
                          minHeight: 48,
                          px: 3,
                          borderRadius: '13px',
                          textTransform: 'none',
                          fontWeight: 700,
                          background: '#172033',
                          '&:hover': {
                            background: '#0f172a',
                          },
                        }}
                      >
                        {currentQuestionIndex < quizQuestions.length - 1
                          ? 'Next Question'
                          : 'Finish Quiz'}
                      </Button>
                    </Box>
                  </Paper>
                )}

                {quizCompleted && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 4.5 },
                      mt: 4,
                      borderRadius: '22px',
                      background:
                        'linear-gradient(135deg, #ffffff 0%, #f5f7ff 100%)',
                      border: '1px solid rgba(37,117,252,0.12)',
                      boxShadow: '0 18px 50px rgba(31,41,55,0.08)',
                    }}
                  >
                    {/* Quiz Result Header */}
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography
                        sx={{
                          fontSize: { xs: '1.6rem', md: '2rem' },
                          fontWeight: 800,
                          color: '#172033',
                        }}
                      >
                        Quiz Completed 🎉
                      </Typography>

                      <Typography
                        sx={{
                          mt: 1,
                          fontSize: '1.05rem',
                          color: '#667085',
                        }}
                      >
                        Here's how you performed
                      </Typography>

                      {/* Score */}
                      <Box
                        sx={{
                          mt: 3,
                          mx: 'auto',
                          maxWidth: 320,
                          p: 2.5,
                          borderRadius: '18px',
                          background:
                            'linear-gradient(135deg, rgba(37,117,252,0.08), rgba(106,17,203,0.08))',
                          border: '1px solid rgba(37,117,252,0.12)',
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            color: '#667085',
                            textTransform: 'uppercase',
                            letterSpacing: '0.8px',
                          }}
                        >
                          Your Final Score
                        </Typography>

                        <Typography
                          sx={{
                            mt: 0.5,
                            fontSize: { xs: '2rem', md: '2.4rem' },
                            fontWeight: 800,
                            background:
                              'linear-gradient(90deg, #2575fc 0%, #6a11cb 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }}
                        >
                          {score} / {quizQuestions.length}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {weakTopicError && (
                      <Alert severity="error" sx={{ mt: 3 }}>
                        {weakTopicError}
                      </Alert>
                    )}

                    {weakTopicAnalysis && !weakTopicLoading && (
                      <Box
                        sx={{
                          mt: 4,
                          p: { xs: 2.5, md: 3.5 },
                          textAlign: 'left',
                          borderRadius: '20px',
                          background:
                            'linear-gradient(135deg, #f8faff 0%, #ffffff 100%)',
                          border: '1px solid rgba(37,117,252,0.12)',
                          boxShadow: '0 12px 35px rgba(31,41,55,0.06)',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.5,
                            mb: 3,
                          }}
                        >
                          <Box
                            sx={{
                              width: 42,
                              height: 42,
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background:
                                'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                              color: '#fff',
                              fontSize: '1.2rem',
                              fontWeight: 800,
                              boxShadow: '0 6px 16px rgba(37,117,252,0.2)',
                            }}
                          >
                            AI
                          </Box>

                          <Box>
                            <Typography
                              sx={{
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                color: '#172033',
                              }}
                            >
                              AI Learning Analysis
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: '0.82rem',
                                color: '#667085',
                                mt: 0.2,
                              }}
                            >
                              Understand your strengths and areas to improve
                            </Typography>
                          </Box>
                        </Box>

                        {weakTopicAnalysis.overall_analysis && (
                          <Typography variant="body1" sx={{ mb: 2 }}>
                            {weakTopicAnalysis.overall_analysis}
                          </Typography>
                        )}

                        {weakTopicAnalysis.weak_topics?.length > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 28,
                                  borderRadius: '6px',
                                  background: '#ef4444',
                                }}
                              />

                              <Typography
                                sx={{
                                  fontSize: '1rem',
                                  fontWeight: 800,
                                  color: '#b42318',
                                }}
                              >
                                Areas to Improve
                              </Typography>
                            </Box>

                            {weakTopicAnalysis.weak_topics.map((item, index) => (
                              <Box key={index} sx={{ mt: 1.5 }}>
                                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                  {item.topic}
                                  {' — '}
                                  {item.priority} priority
                                </Typography>

                                <Typography variant="body2" color="text.secondary">
                                  {item.reason}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}

                        {weakTopicAnalysis.strong_topics?.length > 0 && (
                          <Box>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                mb: 1.5,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 8,
                                  height: 28,
                                  borderRadius: '6px',
                                  background: '#2e7d32',
                                }}
                              />

                              <Typography
                                sx={{
                                  fontSize: '1rem',
                                  fontWeight: 800,
                                  color: '#1b5e20',
                                }}
                              >
                                Strong Areas
                              </Typography>
                            </Box>

                            {weakTopicAnalysis.strong_topics.map((item, index) => (
                              <Box
                                key={index}
                                sx={{
                                  mt: index === 0 ? 0 : 1.5,
                                  p: 2,
                                  borderRadius: '14px',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  transition: 'all 0.2s ease',
                                  '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 20px rgba(31,41,55,0.06)',
                                  },
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontWeight: 700,
                                    color: '#172033',
                                    fontSize: '0.95rem',
                                    mb: 0.5,
                                  }}
                                >
                                  {item.topic}
                                </Typography>

                                <Typography
                                  sx={{
                                    color: '#667085',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {item.reason}
                                </Typography>
                              </Box>
                            ))}
                          </Box>
                        )}
                      </Box>
                    )}

                    {studyRecommendations.length > 0 && (
                      <Box sx={{ mt: 3 }}>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            mb: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 8,
                              height: 28,
                              borderRadius: '6px',
                              background:
                                'linear-gradient(180deg, #7b1fa2 0%, #2575fc 100%)',
                            }}
                          />

                          <Box>
                            <Typography
                              sx={{
                                fontSize: '1rem',
                                fontWeight: 800,
                                color: '#4a148c',
                              }}
                            >
                              Smart Study Recommendations
                            </Typography>

                            <Typography
                              sx={{
                                fontSize: '0.8rem',
                                color: '#667085',
                                mt: 0.2,
                              }}
                            >
                              Personalized next steps based on your performance
                            </Typography>
                          </Box>
                        </Box>

                        {studyRecommendations.map((item, index) => (
                          <Box
                            key={index}
                            sx={{
                              mt: index === 0 ? 0 : 1.5,
                              p: 2,
                              borderRadius: '14px',
                              background: '#ffffff',
                              border: '1px solid #e8eaf0',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                transform: 'translateY(-2px)',
                                boxShadow: '0 8px 20px rgba(31,41,55,0.06)',
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 2,
                                mb: 0.8,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontWeight: 700,
                                  color: '#172033',
                                  fontSize: '0.95rem',
                                }}
                              >
                                {item.topic}
                              </Typography>

                              <Box
                                sx={{
                                  px: 1.2,
                                  py: 0.4,
                                  borderRadius: '20px',
                                  background:
                                    item.priority === 'high'
                                      ? '#fef2f2'
                                      : item.priority === 'medium'
                                        ? '#fff7ed'
                                        : '#f0fdf4',
                                  color:
                                    item.priority === 'high'
                                      ? '#b42318'
                                      : item.priority === 'medium'
                                        ? '#c2410c'
                                        : '#15803d',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {item.priority} priority
                              </Box>
                            </Box>

                            <Typography
                              variant="body2"
                              sx={{
                                color: '#667085',
                                lineHeight: 1.6,
                              }}
                            >
                              {item.recommendation}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}

                    {/* Replace "Retake Quiz" with "Regenerate Quiz" */}
                    <Button
                      variant="contained"
                      color="secondary" // Or keep primary, or use 'info'
                      onClick={handleRegenerateQuiz} // Call the regenerate handler
                      disabled={quizIsLoading || !notes || !currentSessionId} // Disable if conditions aren't met
                      sx={{
                        minHeight: 46,
                        px: 2.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        background:
                          'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                        boxShadow: '0 6px 16px rgba(37,117,252,0.20)',
                        '&:hover': {
                          background:
                            'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                          boxShadow: '0 8px 20px rgba(37,117,252,0.25)',
                        },
                      }}
                      startIcon={quizIsLoading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                      Regenerate Quiz with New Questions
                    </Button>
                    {/* You can add another button here if you still want a "Clear/Back to Notes" option */}
                    {
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setQuizQuestions([]);
                        setQuizCompleted(false);
                        // any other state reset needed to go "back"
                      }}
                      sx={{
                        minHeight: 46,
                        px: 2.5,
                        borderRadius: '12px',
                        textTransform: 'none',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        color: '#475467',
                        border: '1px solid #d0d5dd',
                        background: '#ffffff',
                        '&:hover': {
                          background: '#f8fafc',
                          borderColor: '#98a2b3',
                        },
                      }} // Add margin-left if next to another button
                    >
                      Back to Notes
                    </Button>
                    }
                  </Paper>
                )}

                {/* Flashcard Viewer Area */}
                {!flashcardsLoading && flashcards.length > 0 && (
                  <Paper
                    elevation={0}
                    sx={{
                      p: { xs: 2.5, md: 4 },
                      mt: 4,
                      borderRadius: '22px',
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.96) 0%, rgba(245,248,255,0.96) 100%)',
                      border: '1px solid rgba(37,117,252,0.12)',
                      boxShadow: '0 18px 50px rgba(31,41,55,0.08)',
                    }}
                  >
                    <Box
                      sx={{
                        textAlign: 'center',
                        mb: 3,
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: '1.5rem', md: '1.8rem' },
                          fontWeight: 800,
                          color: '#172033',
                        }}
                      >
                        Flashcards
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.5,
                          fontSize: '0.9rem',
                          color: '#667085',
                        }}
                      >
                        Card {currentCardIndex + 1} of {flashcards.length}
                      </Typography>
                    </Box>
                    <Card
                      variant="outlined"
                      sx={{
                        minHeight: { xs: 220, md: 240 },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        p: { xs: 2.5, md: 4 },
                        cursor: 'pointer',
                        background: isFlipped
                          ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                          : 'linear-gradient(135deg, #f8faff 0%, #eef4ff 100%)',
                        textAlign: 'center',
                        mb: 3,
                        borderRadius: '18px',
                        border: isFlipped
                          ? '1px solid rgba(34,197,94,0.20)'
                          : '1px solid rgba(37,117,252,0.16)',
                        boxShadow: '0 12px 30px rgba(31,41,55,0.07)',
                        transition: 'all 0.25s ease',
                        '&:hover': {
                          transform: 'translateY(-3px)',
                          boxShadow: '0 16px 35px rgba(31,41,55,0.10)',
                        },
                      }}
                      onClick={handleFlipCard}
                    >
                      <CardContent>
                        <Typography
                          variant={isFlipped ? 'body1' : 'h6'}
                          sx={{
                            fontSize: {
                              xs: isFlipped ? '1rem' : '1.35rem',
                              md: isFlipped ? '1.1rem' : '1.55rem',
                            },
                            fontWeight: 700,
                            color: isFlipped ? '#166534' : '#172033',
                            lineHeight: 1.7,
                            maxWidth: 720,
                            '& p': {
                              margin: 0,
                            },
                            '& strong': {
                              color: '#172033',
                            },
                          }}
                        >
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {isFlipped
                              ? flashcards[currentCardIndex]?.definition || ''
                              : flashcards[currentCardIndex]?.term || ''}
                          </ReactMarkdown>
                        </Typography>
                      </CardContent>
                    </Card>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: { xs: 1, md: 1.5 },
                        mb: 3,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Button
                        onClick={handlePrevCard}
                        disabled={currentCardIndex === 0}
                        sx={{
                          minHeight: 44,
                          px: 2.5,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#2575fc',
                          background: '#ffffff',
                          border: '1px solid rgba(37,117,252,0.18)',
                          boxShadow: '0 4px 12px rgba(31,41,55,0.04)',
                          '&:hover': {
                            background: 'rgba(37,117,252,0.05)',
                            borderColor: '#2575fc',
                          },
                          '&.Mui-disabled': {
                            color: '#94a3b8',
                            background: '#f8fafc',
                            borderColor: '#e2e8f0',
                            opacity: 1,
                          },
                        }}
                      >
                        Previous
                      </Button>
                      <Button
                        onClick={handleFlipCard}
                        sx={{
                          minHeight: 46,
                          px: 3,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          color: '#ffffff',
                          background:
                            'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          boxShadow: '0 7px 18px rgba(37,117,252,0.22)',
                          '&:hover': {
                            background:
                              'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                            boxShadow: '0 9px 22px rgba(37,117,252,0.28)',
                          },
                        }}
                      >
                        Flip Card
                      </Button>
                      <Button
                        onClick={handleNextCard}
                        disabled={currentCardIndex === flashcards.length - 1}
                        sx={{
                          minHeight: 44,
                          px: 2.5,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#2575fc',
                          background: '#ffffff',
                          border: '1px solid rgba(37,117,252,0.18)',
                          boxShadow: '0 4px 12px rgba(31,41,55,0.04)',
                          '&:hover': {
                            background: 'rgba(37,117,252,0.05)',
                            borderColor: '#2575fc',
                          },
                          '&.Mui-disabled': {
                            color: '#94a3b8',
                            background: '#f8fafc',
                            borderColor: '#e2e8f0',
                            opacity: 1,
                          },
                        }}
                      >
                        Next
                      </Button>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <Button
                        variant="outlined"
                        color="success"
                        onClick={handleDownloadFlashcards}
                        sx={{
                          minHeight: 44,
                          px: 2.5,
                          borderRadius: '12px',
                          textTransform: 'none',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          color: '#475467',
                          border: '1px solid #d0d5dd',
                          background: '#ffffff',
                          '&:hover': {
                            background: '#f8fafc',
                            borderColor: '#98a2b3',
                          },
                        }}
                      >
                        Download All Flashcards (CSV)
                      </Button>
                    </Box>
                  </Paper>
                )}

                {/* Floating Action Button for Study Planner */}
                {isAuthenticated && (
                  <Tooltip title="Open Study Planner" arrow>
                    <Fab
                      color="primary"
                      aria-label="study-planner"
                      onClick={handleOpenPlanner}
                      sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1000,
                        width: 58,
                        height: 58,
                        borderRadius: '20px',
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 8px 24px rgba(37, 117, 252, 0.30)',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                          transform: 'translateY(-3px) scale(1.04)',
                          boxShadow: '0 12px 30px rgba(37, 117, 252, 0.40)',
                        },
                      }}
                    >
                      <AddIcon />
                    </Fab>
                  </Tooltip>
                )}

                {/* Study Planner Model */}
                <Dialog
                    open={isPlannerOpen}
                    onClose={handleClosePlanner}
                    fullWidth
                    maxWidth="sm"
                    PaperProps={{
                      sx: {
                        borderRadius: '22px',
                        background:
                          'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                        border: '1px solid rgba(37,117,252,0.12)',
                        boxShadow: '0 20px 60px rgba(31,41,55,0.16)',
                        overflow: 'hidden',
                      },
                    }}
                  >
                  <DialogTitle
                    sx={{
                      px: { xs: 2.5, md: 3 },
                      py: 2.5,
                      borderBottom: '1px solid #eef2f6',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          color: '#fff',
                          boxShadow: '0 6px 16px rgba(37,117,252,0.20)',
                        }}
                      >
                        <EventNoteIcon />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#172033',
                          }}
                        >
                          Study Planner
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: '#667085',
                            mt: 0.2,
                          }}
                        >
                          Plan and organize your upcoming study sessions
                        </Typography>
                      </Box>
                    </Box>
                  </DialogTitle>

                  <DialogContent dividers>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                      <Typography
                        sx={{
                          fontSize: '0.9rem',
                          color: '#667085',
                          lineHeight: 1.6,
                        }}
                      >
                        Create a study plan for{' '}
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 700,
                            color: '#172033',
                          }}
                        >
                          {topic || 'Current Topic'}
                        </Box>
                      </Typography>
                      <Box sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                          },
                          gap: 1.5,
                          alignItems: 'center',
                        }}>
                        <DatePicker
                          label="Review Date"
                          value={newPlanDate}
                          onChange={(newValue) => setNewPlanDate(newValue)}
                          slotProps={{ textField: { size: 'small' } }}
                          format="yyyy-MM-dd"
                          sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                              background: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e2e8f0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#2575fc',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#2575fc',
                              },
                            },
                          }}
                        />
                        <TextField
                          label="Total minutes"
                          type="number"
                          size="small"
                          value={planDuration}
                          onChange={(e) => setPlanDuration(Number(e.target.value))}
                          sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                              background: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e2e8f0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#2575fc',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#2575fc',
                              },
                            },
                          }}
                        />
                        <TextField
                          label="Study block"
                          type="number"
                          size="small"
                          value={planStudyMinutes}
                          onChange={(e) => setPlanStudyMinutes(Number(e.target.value))}
                          sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                              background: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e2e8f0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#2575fc',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#2575fc',
                              },
                            },
                          }}
                        />
                        <TextField
                          label="Break"
                          type="number"
                          size="small"
                          value={planBreakMinutes}
                          onChange={(e) => setPlanBreakMinutes(Number(e.target.value))}
                          sx={{
                            width: '100%',
                            '& .MuiOutlinedInput-root': {
                              borderRadius: '12px',
                              background: '#ffffff',
                              '& fieldset': {
                                borderColor: '#e2e8f0',
                              },
                              '&:hover fieldset': {
                                borderColor: '#2575fc',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#2575fc',
                              },
                            },
                          }}
                        />
                        <Button
                          variant="contained"
                          color="info"
                          onClick={handleAddPlanEntry}
                          disabled={!topic || !newPlanDate || planLoading}
                          sx={{
                            width: '100%',
                            minHeight: 46,
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            fontSize: '0.88rem',
                            background:
                              'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                            boxShadow: '0 7px 18px rgba(37,117,252,0.20)',
                            '&:hover': {
                              background:
                                'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                              boxShadow: '0 9px 22px rgba(37,117,252,0.25)',
                            },
                          }}
                        >
                          Add to Plan
                        </Button>
                      </Box>
                    </Box>
                    {planLoading && <CircularProgress size={24} sx={{ display: 'block', mx: 'auto', my: 2 }} />}
                    {planError && <Alert severity="error" sx={{ mb: 2 }}>{planError}</Alert>}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 28,
                          borderRadius: '6px',
                          background:
                            'linear-gradient(180deg, #2575fc 0%, #6a11cb 100%)',
                        }}
                      />

                      <Typography
                        sx={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: '#172033',
                        }}
                      >
                        Upcoming Reviews
                      </Typography>
                    </Box>
                    {studyPlanEntries.length === 0 && !planLoading && (
                      <Typography variant="body2" color="text.secondary">
                        No reviews scheduled yet.
                      </Typography>
                    )}
                    <List
                      dense
                      sx={{
                        maxHeight: '30vh',
                        overflowY: 'auto',
                        mt: 1,
                        p: 0.5,
                        background: '#f8fafc',
                        border: '1px solid #e8edf3',
                        borderRadius: '16px',
                        '&::-webkit-scrollbar': {
                          width: '6px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                          background: '#c7d2fe',
                          borderRadius: '10px',
                        },
                      }}
                    >
                      {studyPlanEntries.map((entry) => (
                        <ListItem
                          key={entry.id}
                          sx={{
                            mb: 1,
                            px: 2,
                            py: 1.5,
                            borderRadius: '12px',
                            background: '#ffffff',
                            border: '1px solid #e8edf3',
                            '&:last-child': {
                              mb: 0,
                            },
                          }}
                          secondaryAction={
                            <IconButton
                            edge="end"
                            aria-label="delete"
                            onClick={() => handleDeletePlanEntry(entry.id)}
                            disabled={planLoading}
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: '10px',
                              color: '#98a2b3',
                              '&:hover': {
                                color: '#dc2626',
                                background: '#fef2f2',
                              },
                              '&.Mui-disabled': {
                                color: '#cbd5e1',
                              },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          }
                        >
                          <ListItemText
                            primary={entry.topic}
                            primaryTypographyProps={{
                              sx: {
                                fontWeight: 700,
                                fontSize: '0.92rem',
                                color: '#172033',
                                mb: 0.4,
                              },
                            }}
                            secondary={
                              <Box component="span" sx={{ display: 'block' }}>
                                <Typography
                                  variant="body2"
                                  sx={{
                                    color: '#667085',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    mb: 0.3,
                                  }}
                                >
                                  Review on: {entry.review_date}
                                </Typography>
                                {(entry.plan || []).map((block, index) => (
                                  <Typography key={`${entry.id}-${index}`} variant="body2" color="text.secondary">
                                    {block.label}
                                  </Typography>
                                ))}
                              </Box>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </DialogContent>
                  <DialogActions>
                    <Button onClick={handleClosePlanner} color="primary">
                      Close
                    </Button>
                  </DialogActions>
                </Dialog>

                {/* Floating Action Button for Chatbot */}
                {isAuthenticated && notes && (
                  <Tooltip title="Ask AI about Notes" arrow>
                    <Fab
                      color="secondary"
                      aria-label="chatbot"
                      onClick={handleOpenChat}
                      sx={{
                        position: 'fixed',
                        bottom: 20,
                        left: 20,
                        zIndex: 1000,
                        width: 60,
                        height: 60,
                        borderRadius: '20px',
                        color: '#ffffff',
                        background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.25)',
                        boxShadow: '0 8px 24px rgba(37, 117, 252, 0.35)',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #1d65df 0%, #5b0eb5 100%)',
                          transform: 'translateY(-3px) scale(1.04)',
                          boxShadow: '0 12px 30px rgba(37, 117, 252, 0.45)',
                        },
                      }}
                    >
                      <ChatBubbleOutlineRoundedIcon
                        sx={{
                          fontSize: 30,
                          color: '#ffffff',
                        }}
                      />
                    </Fab>
                  </Tooltip>
                )}

                {/* Chatbot Modal */}
                <Dialog
                  open={isChatOpen}
                  onClose={handleCloseChat}
                  fullWidth
                  maxWidth="sm"
                  PaperProps={{
                    sx: {
                      borderRadius: '22px',
                      background:
                        'linear-gradient(135deg, #ffffff 0%, #f8faff 100%)',
                      border: '1px solid rgba(37,117,252,0.12)',
                      boxShadow: '0 20px 60px rgba(31,41,55,0.16)',
                      overflow: 'hidden',
                    },
                  }}
                >
                  <DialogTitle
                    sx={{
                      px: { xs: 2.5, md: 3 },
                      py: 2.5,
                      borderBottom: '1px solid #eef2f6',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 42,
                          height: 42,
                          borderRadius: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background:
                            'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                          color: '#fff',
                          boxShadow: '0 6px 16px rgba(37,117,252,0.20)',
                        }}
                      >
                        <ChatIcon />
                      </Box>

                      <Box>
                        <Typography
                          sx={{
                            fontSize: '1.2rem',
                            fontWeight: 800,
                            color: '#172033',
                          }}
                        >
                          Ask AI about these Notes
                        </Typography>

                        <Typography
                          sx={{
                            fontSize: '0.8rem',
                            color: '#667085',
                            mt: 0.2,
                          }}
                        >
                          Get answers and clarify concepts from your notes
                        </Typography>
                      </Box>
                    </Box>
                  </DialogTitle>
                  <DialogContent dividers>
                    <Box
                      sx={{
                        height: '45vh',
                        minHeight: 300,
                        display: 'flex',
                        flexDirection: 'column',
                        background: '#f8faff',
                      }}
                    >
                      <List
                        sx={{
                          flexGrow: 1,
                          overflowY: 'auto',
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          '&::-webkit-scrollbar': {
                            width: '6px',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: '#c7d2fe',
                            borderRadius: '10px',
                          },
                        }}
                      >
                        {chatHistory.map((message, index) => (
                          <ListItem
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <Paper
                              elevation={0}
                              sx={{
                                p: 1.5,
                                bgcolor: message.sender === 'user' ? '#2575fc' : '#ffffff',
                                color: message.sender === 'user' ? '#ffffff' : '#344054',
                                border: message.sender === 'user'
                                  ? '1px solid rgba(37,117,252,0.12)'
                                  : '1px solid #e8edf3',
                                borderRadius: message.sender === 'user'
                                  ? '18px 18px 5px 18px'
                                  : '18px 18px 18px 5px',
                                maxWidth: '85%',
                                boxShadow: '0 4px 12px rgba(31,41,55,0.05)',
                                '& p': {
                                  margin: 0,
                                  lineHeight: 1.6,
                                  wordBreak: 'break-word',
                                },
                                '& p + p': {
                                  mt: 1,
                                },
                              }}
                            >
                              {message.sender === 'ai' ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                              ) : (
                                <ListItemText primary={message.text} sx={{ wordBreak: 'break-word' }} />
                              )}
                            </Paper>
                          </ListItem>
                        ))}
                        <div ref={chatMessagesEndRef} />
                      </List>
                      <Divider />
                      <Box
                        sx={{
                          mx: 1.5,
                          mb: 1.5,
                          p: 1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          bgcolor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '16px',
                          boxShadow: '0 4px 14px rgba(31,41,55,0.04)',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                          '&:focus-within': {
                            borderColor: '#2575fc',
                            boxShadow: '0 0 0 3px rgba(37,117,252,0.10)',
                          },
                        }}
                      >
                        <InputBase
                          sx={{
                            flex: 1,
                            px: 1,
                            py: 0.75,
                            color: '#344054',
                            fontSize: '0.95rem',
                            lineHeight: 1.6,
                            '& input::placeholder': {
                              color: '#98a2b3',
                              opacity: 1,
                            },
                            '& textarea::placeholder': {
                              color: '#98a2b3',
                              opacity: 1,
                            },
                          }}
                          placeholder="Ask a question about the notes..."
                          value={chatInput}
                          onChange={handleChatInputChange}
                          disabled={chatIsLoading}
                          multiline
                          maxRows={3}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendChatMessage();
                            }
                          }}
                        />
                        <IconButton
                          aria-label="send message"
                          onClick={handleSendChatMessage}
                          disabled={chatIsLoading || !chatInput.trim()}
                          sx={{
                            width: 44,
                            height: 44,
                            flexShrink: 0,
                            color: '#ffffff',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #2575fc 0%, #6a11cb 100%)',
                            boxShadow: '0 5px 14px rgba(37,117,252,0.22)',
                            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #1d65e8 0%, #580eae 100%)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 7px 18px rgba(37,117,252,0.30)',
                            },
                            '&.Mui-disabled': {
                              color: '#ffffff',
                              background: '#cbd5e1',
                              boxShadow: 'none',
                            },
                          }}
                        >
                          {chatIsLoading ? <CircularProgress size={22} sx={{ color: '#ffffff' }} /> : <SendIcon />}
                        </IconButton>
                      </Box>
                      {chatError && <Alert severity="error" sx={{ m: 1 }}>{chatError}</Alert>}
                    </Box>
                  </DialogContent>
                  <DialogActions
                    sx={{
                      px: 3,
                      py: 2,
                      borderTop: '1px solid #eef2f6',
                      background: '#ffffff',
                    }}
                  >
                    <Button
                      onClick={handleCloseChat}
                      variant="outlined"
                      sx={{
                        px: 3,
                        py: 1,
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 700,
                        color: '#475467',
                        borderColor: '#d0d5dd',
                        '&:hover': {
                          borderColor: '#98a2b3',
                          background: '#f8fafc',
                        },
                      }}
                    >
                      Close
                    </Button>
                  </DialogActions>
                </Dialog>

              </Box>
            </Container>
            {/* END: Your Existing Main Application UI */}

          </ProtectedRoute>
        }
      /> {/* End Protected Main App Route */}

      {/* --- Catch-all / Redirect Route --- */}
      <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />

    </Routes>
    {/* ================= End Routing ================= */}

  </React.Fragment>
);
}