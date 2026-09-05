/**
 * The LaTeX CV as it stands today, shipped as the starting point for
 * `SharedContent.cvLatex`.
 *
 * It is a **shape**, not a source of content: the CV the AI writes takes its
 * facts from the résumé profile it is given (see `lib/cv-latex.ts`, which says
 * so in as many words), and only its structure — the preamble, the section
 * order, how a grouped employer or a bulleted role is laid out — from here.
 *
 * Editable in the admin panel, so the format can move on without a deploy.
 * Written with `String.raw` because LaTeX is mostly backslashes, and `\n` in
 * `\noindent` is a newline to an ordinary template literal.
 */
export const DEFAULT_CV_LATEX = String.raw`\documentclass[letter,10pt]{article}

\usepackage{geometry}
\geometry{top=1in, bottom=1in, left=1in, right=1in}

\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{parskip}
\usepackage{hyperref}
\usepackage{amsthm}
% Uses Font Awesome icons when available and readable text as a fallback.
\IfFileExists{fontawesome5.sty}{
    \usepackage{fontawesome5}
}{
    \newcommand{\faPhone}{Phone:}
    \newcommand{\faEnvelope}{Email:}
    \newcommand{\faGlobe}{Website:}
    \newcommand{\faLinkedin}{LinkedIn:}
}

\hypersetup{
colorlinks=true,
urlcolor=blue
}

\titleformat{\section}
{\large\bfseries}
{}
{0em}
{}
[\titlerule]

\titleformat{\subsection}[runin]
{\bfseries}
{}
{0em}
{}
[.]

\begin{document}

% --------------------------------------------------
% HEADER
% --------------------------------------------------

\begin{center}
{\huge \textbf{Vicente G. G\'omez}} \\
\vspace{2mm}
\faPhone\ +56 9 2092 6785
\textbar{}
\faEnvelope\ \href{mailto:vicente@vicentegomez.cl}{vicente@vicentegomez.cl}
\\[1mm]
\faGlobe\ \href{https://resume.vicentegomez.cl/}{resume.vicentegomez.cl}
\textbar{}
\faLinkedin\ \href{https://www.linkedin.com/in/vicenteggomez}{linkedin.com/in/vicenteggomez}
\end{center}

\vspace{5mm}

% --------------------------------------------------
% PROFESSIONAL SUMMARY
% --------------------------------------------------

\section*{Professional Summary}

Economics student recognized among the top 1\% of my cohort at Universidad de Chile for three consecutive years, with experience applying data analysis and process automation to capital management and financial operations at Santander Chile and Bridge Ventures Group. Teaching Assistant and tutor across economics, econometrics, statistics, accounting, and finance, with international academic experience in Germany and the United States.


% --------------------------------------------------
% EXPERIENCE
% --------------------------------------------------

\section*{Experience}

% Grouped employer entry: company appears once, followed by roles held.
\noindent
\textbf{Bridge Ventures Group} \hfill Jun 2026 -- Present

\vspace{1mm}
\noindent
\hspace{1em}\textbf{Commercial Executive} \hfill Sep 2026 -- Present

\begin{itemize}[noitemsep, leftmargin=2.5em]
    \item Support the day-to-day operations of the group's financial services business, initially working with the Peru team across leasing and factoring processes.
    \item Contribute to operational follow-up and process improvement, connecting commercial requirements with the execution of financial operations.
\end{itemize}

\noindent
\hspace{1em}\textbf{Business Analyst Intern} \hfill Jun 2026 -- Sep 2026

\begin{itemize}[noitemsep, leftmargin=2.5em]
    \item Supported the CEO across business operations, technology, and strategic initiatives.
    \item Contributed to the development and launch of an internal platform for communication, process automation, billing, and payments, and supported market research for real estate opportunities.
\end{itemize}

\noindent
\textbf{Capital Management Intern} \hfill Mar 2026 -- Jun 2026 \\
\textit{Santander Chile}

\begin{itemize}[noitemsep]
    \item Supported Capital Management through data validation and process automation using VBA, JavaScript, SQL, and Databricks.
    \item Worked with capital management data and gained exposure to Basel III, RWA, RORWA, and RORAC.
\end{itemize}

\noindent \textbf{Teaching Assistant} \hfill Feb 2024 -- Present \\
\textit{Department of Business and Economics, Universidad de Chile}

\begin{itemize}[noitemsep]
    \item \textbf{Econometrics} (Prof. Javiera Selman \& Valentina Paredes, 2 semesters)
    \item \textbf{Introduction to Macroeconomics} (Prof. Jos\'e De Gregorio, 2 semesters)
    \item \textbf{Accounting} (Prof. J. Olivares, D. Silva \& F. S\'anchez, 5 semesters)
    \item \textbf{Introduction to Finance} (Prof. Claudio Bonilla, 1 semester)
    \item \textbf{Statistics} (Prof. Eduardo Engel \& Juan D\'iaz, 1 semester)
    \item \textbf{Communication Skills} (Prof. Tamara Cabrera, 2 semesters)
    \item \textbf{Introduction to Economics} (Prof. Nathaly Rivera, 1 semester)
\end{itemize}

\noindent
\textbf{Economics and Microeconomics Tutor} \hfill Mar 2025 -- Jun 2026 \\
\textit{Department of Economics, Universidad de Chile} \\
Developed and delivered weekly lessons and supplementary materials to enhance student comprehension of core Microeconomics and Economics concepts.

\noindent
\textbf{Project Designer} \hfill Jul 2024 -- Sep 2024 \\
\textit{Provost Office, Universidad de Chile} \\
Designed strategic guidelines, governance principles, and operational objectives for the University of Chile's Alumni Network. Structured frameworks for professional and entrepreneurial mentoring programs to strengthen alumni engagement and long-term institutional linkage.

\noindent
\textbf{Marketing Staff} \hfill Apr 2022 -- Mar 2024 \\
\textit{Espacio Mejor Foundation} \\
Promoted institutional initiatives, managed social media strategy, and coordinated data collection to support organizational growth and project execution.

\noindent
\textbf{Chief Waiter} \hfill Summer 2023 \\
\textit{Positano Italy Coffee Shop \& Bar} \\
Led and supervised service staff, managed inventory and supplier coordination, ensuring operational efficiency and high customer satisfaction.

% --------------------------------------------------
% EDUCATION
% --------------------------------------------------

\section*{Education}
\noindent
\textbf{B.S. in Economics} \hfill Sep 2026 -- Present \\
\textit{Universidad Carlos III de Madrid} \\
Transfer Student from Universidad de Chile

\noindent
\textbf{B.S. in Economics} \hfill 2023 -- 2025 \\
\textit{Universidad de Chile} \\
FEN Honor Roll -- Top 1\% of class (2023, 2024 \& 2025)

\noindent
\textbf{Business Administration, BWL} \hfill Fall 2025 \\
\textit{Universit\"at Mannheim} \\
Semester abroad, awarded Baden-W\"urttemberg scholarship

\noindent
\textbf{English Language Program} \hfill Summer 2026 \\
\textit{University of Pennsylvania} \\
Selected among 90 students from 150,000+ applicants through \textit{Santander Open Academy}; coursework in Leadership, Positive Psychology, and American Values \& Immigration.

% --------------------------------------------------
% SKILLS
% --------------------------------------------------

\section*{Skills}

\begin{itemize}
\item \textbf{Technical Skills}
\begin{itemize}[noitemsep]
\item Microsoft Office (Word, Advanced Excel, VBA)
\item Python (Intermediate), R (Intermediate), SQL (Basic), JavaScript (Basic), Stata (Basic)
\item Databricks, LaTeX (Intermediate)
\end{itemize}

\item \textbf{Soft Skills}
\begin{itemize}[noitemsep]
    \item Public Speaking \& Communication
    \item Problem-Solving \& Critical Thinking
\end{itemize}
\end{itemize}

% --------------------------------------------------
% LANGUAGES
% --------------------------------------------------

\section*{Languages}

\begin{itemize}[noitemsep]
\item Spanish: Native Proficiency
\item English: Professional Proficiency (C1)
\end{itemize}

% --------------------------------------------------
% COURSES
% --------------------------------------------------

\section*{Additional Courses}

\begin{itemize}[noitemsep]
\item Inferential Statistics,
\textit{Duke University} \hfill Jan 2026

\item Supply Chain Logistics,
\textit{Rutgers, The State University of New Jersey} \hfill Jan 2026

\item Bloomberg Market Concepts,
\textit{Bloomberg for Education} \hfill Jul 2025

\item Introduction to Probability and Data with R,
\textit{Duke University} \hfill Jul 2025

\item Everyday Excel, Certificate with Honors,
\textit{University of Colorado Boulder} \hfill Jan 2025

\item Leadership, Innovation, and Entrepreneurship Program,
\textit{Universidad Adolfo Ib\'a\~nez} \hfill Jul 2022

\item Business Technology Management, Summer School,
\textit{Universidad de Chile} \hfill Jan 2022

\item Intermediate Excel (100 hours),
\textit{Edutecno} \hfill Dec 2021

\item Ciclo para secundarios,
\textit{Libertad y Desarrollo} \hfill Sep 2021

\item LATAM Change Agents Program,
\textit{Fundaci\'on Espacio Mejor} \hfill Jun 2021

\item Customer Service and Sales,
\textit{BCN School of Business} \hfill Dec 2020

\end{itemize}

% --------------------------------------------------
% AWARDS
% --------------------------------------------------

\section*{Awards \& Recognitions}

\begin{itemize}[noitemsep]
\item FEN Honor Roll 2024, 2025 \& 2026 (Top 1\% of class),
\textit{Universidad de Chile}

\item Graduated with Honors, 2019--2022 (GPA: 6.8 out of 7),
\textit{Seminario San Rafael} \hfill Dec 2022

\item Diploma of Honor, XXII Seminar on Philosophy and Psychology,
\textit{Juana Ross de Edwards} \hfill Oct 2022

\item Critical Thinking Award, 18th Spanish Debate Inter-school,
\textit{Universidad Andr\'es Bello} \hfill Sep 2022

\item 1st Place: Health and First Aid Inter-school,
\textit{Universidad Andr\'es Bello} \hfill Jun 2022

\item Finalist, V Challengers Version,
\textit{Universidad de los Andes} \hfill Apr 2022

\end{itemize}

% --------------------------------------------------
% LEADERSHIP & VOLUNTEERING
% --------------------------------------------------

\section*{Leadership \& Volunteering}

\noindent
\textbf{School of Business and Economics Counselor} \hfill 2025 \\
Peer-elected role focused on enhancing the faculty environment, improving internal processes, and facilitating communication between students and the school council.

\noindent
\textbf{Class Representative} \hfill 2023 \& 2024 \\
Elected representative twice, serving as the primary liaison between students and the faculty council. Identified student needs and concerns, then communicated them to faculty and administration.

\noindent
\textbf{Techo-Chile Tutoring} \hfill 2021 -- 2022 \\
Provided academic support to primary school children in economically vulnerable communities, focusing on math and history.

\end{document}
`;
