document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let state = {
        stage: 'LANDING',
        loading: true,
        selectedTShirts: [],
        answers: {},
        registrationData: {
            name: '',
            phone: '',
            personalEmail: '',
            universityEmail: '',
        },
        ipAddress: '',
        surveyId: `survey_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        questionIndex: 0,
        textAnswer: ''
    };

    // --- CONSTANTS ---
    const TSHIRT_DESIGNS = [
        { id: '1', designName: 'Classic Black Moon', frontImage: './images/tshirts/tshirt1.png' },
        { id: '2', designName: 'White Moon Phase', frontImage: './images/tshirts/tshirt2.png' },
        { id: '3', designName: 'Gray Abstract Moon', frontImage: './images/tshirts/tshirt3.png' },
        { id: '4', designName: 'Navy Crescent', frontImage: './images/tshirts/tshirt4.png' },
        { id: '5', designName: 'Beige Minimal', frontImage: './images/tshirts/tshirt5.png' },
        { id: '6', designName: 'Midnight Eclipse', frontImage: './images/tshirts/tshirt6.png' },
        { id: '7', designName: 'Lunar Wave', frontImage: './images/tshirts/tshirt7.png' },
        { id: '8', designName: 'Cosmic Dust', frontImage: './images/tshirts/tshirt8.png' },
        { id: '9', designName: 'Solar Flare', frontImage: './images/tshirts/tshirt9.png' },
        { id: '10', designName: 'Stellar Night', frontImage: './images/tshirts/tshirt10.png' },
        { id: '11', designName: 'Aurora Glow', frontImage: './images/tshirts/tshirt11.png' },
        { id: '12', designName: 'Twilight Shadow', frontImage: './images/tshirts/tshirt12.png' },
        { id: '13', designName: 'Dawn Breaker', frontImage: './images/tshirts/tshirt13.png' },
        { id: '14', designName: 'Dusk Horizon', frontImage: './images/tshirts/tshirt14.png' },
        { id: '15', designName: 'Moonlight Sonata', frontImage: './images/tshirts/tshirt15.png' }
    ];
    const QUESTIONS = [
        { id: 'fit', question: 'Which fit do you like?', options: ['Oversized', 'Regular', 'Slim', 'Free size'] },
        { id: 'colors', question: 'Which colors do you wear most often?', options: ['Black / White', 'Bright', 'Light', 'Dark'] },
        { id: 'design', question: 'What type of T-shirt designs do you like?', options: ['Simple', 'Graphics', 'Text', 'Plain'] },
        { id: 'buyingReasons', question: 'What is the biggest reason not to buy T-shirts online?', options: ['Price', 'Not sure on size/fit', 'Fabric quality doubts', 'Designs not my vibe', 'Shipping/returns'] },
        { id: 'frequency', question: 'How often do you buy T-shirts?', options: ['Monthly', 'Every 2–3 months', 'Few times a year', 'Rarely'] },
        { id: 'priorities', question: 'What matters most in a T-shirt?', options: ['Comfort', 'Strong', 'Cool Design', 'Daily Use'] },
        { id: 'size', question: 'What is your usual size?', options: ['XS', 'S', 'M', 'L', 'XL', '2XL+'] },
        { id: 'purchaseFactors', question: 'When you walk into a store and want to buy a T-shirt, what are the things that you look for? (Optional)', options: [], isText: true }
    ];

    // --- API SERVICE ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwa8mcbgZNJ3lRgE7k0vgwmCDyyaTCfWNPOiqzFMqoUGxYLdrZvfeClE5J8RyjSG-gOpQ/exec';
    async function sendData(action, data, noCors = false) {
        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                mode: noCors ? 'no-cors' : 'cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: 'follow',
                body: JSON.stringify({ action, data }),
            });
            if (!noCors && !response.ok) throw new Error(`Server responded with status: ${response.status}`);
        } catch (error) {
            if (action === 'submitRegistrationData' && error instanceof TypeError && error.message === 'Failed to fetch') {
              console.warn("Caught 'Failed to fetch' error on registration, assuming success.");
              return;
            }
            console.error(`Failed to execute action "${action}"`, error);
            throw error;
        }
    }
    const logSurveyStart = (ip, surveyId) => sendData('logSurveyStart', { ip, surveyId }, true).catch(e => console.warn(e));
    const submitTshirtSelection = (ip, surveyId, selectedTShirts) => {
        const tshirtData = {};
        for (let i = 1; i <= 15; i++) tshirtData[`tshirt_${i}`] = selectedTShirts.includes(String(i)) ? 1 : 0;
        sendData('submitTshirtSelection', { ip, surveyId, ...tshirtData }, true).catch(e => console.warn(e));
    };
    const logPreferencesIntroClick = (ip, surveyId) => sendData('logPreferencesIntroClick', { ip, surveyId }, true).catch(e => console.warn(e));
    const submitQuestionAnswers = (ip, surveyId, answers) => sendData('submitQuestionAnswers', { ip, surveyId, ...answers }, true).catch(e => console.warn(e));
    const logRegistrationIntroClick = (ip, surveyId) => sendData('logRegistrationIntroClick', { ip, surveyId }, true).catch(e => console.warn(e));
    const submitRegistrationData = (ip, surveyId, registrationData) => sendData('submitRegistrationData', { ip, surveyId, ...registrationData }, false);
    const logCompletedPageClick = (ip, surveyId) => sendData('logCompletedPageClick', { ip, surveyId }, true).catch(e => console.warn(e));
    const trackError = (surveyId, message, stack) => sendData('trackError', { surveyId, message, stack }, true).catch(e => console.warn(e));

    // --- RENDER FUNCTIONS ---
    const root = document.getElementById('root');
    const render = () => {
        root.innerHTML = ''; // Clear previous content
        if (state.loading) {
            root.innerHTML = getLoadingHTML();
            return;
        }
        switch (state.stage) {
            case 'LANDING': root.innerHTML = getLandingHTML(); break;
            case 'TSHIRT_SELECTION': root.innerHTML = getTshirtSelectionHTML(); break;
            case 'PREFERENCES_INTRO': root.innerHTML = getPreferencesIntroHTML(); break;
            case 'QUESTIONS': root.innerHTML = getQuestionsHTML(); break;
            case 'REGISTRATION_INTRO': root.innerHTML = getRegistrationIntroHTML(); break;
            case 'REGISTRATION': root.innerHTML = getRegistrationHTML(); break;
            case 'COMPLETED': root.innerHTML = getCompletedHTML(); break;
            default: root.innerHTML = getLandingHTML();
        }
    };

    const handleStageChange = (newStage, delay = 2000) => {
        state.loading = true;
        render();
        setTimeout(() => {
            state.stage = newStage;
            state.loading = false;
            render();
        }, delay);
    };

    // --- HTML TEMPLATES ---
    const getLoadingHTML = () => `<div class="flex flex-col items-center justify-center min-h-screen bg-white"><div class="text-center animate-pulse"><img src="./images/logo/loader.png" alt="REDMOON Loading" class="w-16 h-8 md:w-20 md:h-10 object-contain mx-auto"/></div></div>`;
    const getLandingHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Be a Part of Defining <span class="font-semibold text-[#8B0909]">MIT's Fashion</span></h1><div class="text-black text-xs sm:text-sm max-w-lg"><p class="mb-4">Complete this survey to earn the <span class="font-bold text-black">Badge of Communal</span> and unlock exclusive offers at REDMOON</p></div><button data-action="start-survey" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">TAKE THE SURVEY ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
    const getTshirtSelectionHTML = () => {
        const cards = TSHIRT_DESIGNS.map(tshirt => {
            const isSelected = state.selectedTShirts.includes(tshirt.id);
            return `<div class="group">
                <div class="relative aspect-[4/5] overflow-hidden no-rounded"><img src="${tshirt.frontImage}" alt="${tshirt.designName}" class="w-full h-full object-cover no-rounded transition-transform duration-300 group-hover:scale-105" /></div>
                <button data-action="toggle-tshirt" data-id="${tshirt.id}" class="w-full no-rounded small-caps text-sm py-2 mt-2 transition-colors ${isSelected ? 'bg-gray-400 text-black' : 'bg-black text-white hover:bg-gray-800'}">${isSelected ? 'Unselect' : 'Select'}</button>
            </div>`;
        }).join('');
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="mb-4 text-center"><div class="mb-0"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /></div><h2 class="text-lg md:text-xl text-[#8B0909] mb-4 font-light">OFFICIAL SURVEY</h2><p class="text-black text-sm md:text-base max-w-3xl mx-auto mb-4">Join the REDMOON wardrobe. Shape MIT's fashion identity. Select your preferred designs from our curated collection of <span class="font-semibold">fifteen exclusive T-shirts</span>.</p><p class="text-black text-xs md:text-sm">Your selections help us create the perfect REDMOON collection for MIT.</p></div><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">${cards}</div><div class="text-center"><button data-action="finalize-tshirts" ${state.selectedTShirts.length === 0 ? 'disabled' : ''} class="bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded font-bold w-full max-w-2xl small-caps disabled:opacity-50 disabled:cursor-not-allowed">Finalize My Opinions</button></div></div>`;
    };
    const getPreferencesIntroHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Time to personalize it <span class="font-semibold text-[#8B0909]">even more</span></h1><div class="text-black text-xs sm:text-sm max-w-lg space-y-4"><p>Please answer the 8 questions to help us create the perfect T-shirts for MIT</p></div><button data-action="start-questions" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">ANSWER THE QUESTIONS ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
    const getQuestionsHTML = () => {
        const currentQuestion = QUESTIONS[state.questionIndex];
        const progressBars = Array.from({ length: QUESTIONS.length }).map((_, i) => `<div class="h-1 transition-colors ${i < state.questionIndex + 1 ? 'bg-[#8B0909]' : 'bg-black opacity-20'}"></div>`).join('');
        let optionsHTML = '';
        if (currentQuestion.isText) {
            optionsHTML = `<div class="space-y-4">
                <textarea data-input="text-answer" placeholder="Enter your answer here..." class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 min-h-[120px] no-rounded focus:outline-none focus:ring-0">${state.textAnswer}</textarea>
                <button data-action="submit-text-answer" class="bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded w-full font-bold small-caps">PROCEED TO FINAL STAGE</button>
            </div>`;
        } else {
            optionsHTML = `<div class="space-y-3">${currentQuestion.options.map(opt => `<button data-action="answer-question" data-answer="${opt}" class="question-option bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded w-full text-left small-caps transition-colors">${opt}</button>`).join('')}</div>`;
        }
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="mb-4 text-center"><div class="mb-0"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /></div><h2 class="text-lg md:text-xl text-[#8B0909] mb-4 font-light">OFFICIAL SURVEY</h2><div class="grid grid-cols-8 gap-2 max-w-2xl mx-auto mb-8">${progressBars}</div></div><div class="max-w-2xl mx-auto"><div class="text-center"><h3 class="text-xl md:text-2xl text-black mb-8 font-light">${currentQuestion.question}</h3>${optionsHTML}</div></div></div>`;
    };
    const getRegistrationIntroHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">At last, time to claim your <span class="font-semibold text-[#8B0909]">75% offer</span>.</h1><div class="text-black text-xs sm:text-sm max-w-lg space-y-4"><p>Fill out this form to receive your special offer as an MIT student.</p></div><button data-action="start-registration" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">CLAIM THE OFFER ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
    const getRegistrationHTML = () => {
        const { name, phone, personalEmail } = state.registrationData;
        const isEmailValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isFormValid = name.trim() !== '' && phone.trim() !== '' && isEmailValid(personalEmail);
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="mb-4 text-center"><div class="mb-0"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /></div><h2 class="text-lg md:text-xl text-[#8B0909] mb-4 font-light">OFFICIAL SURVEY</h2><p class="text-black text-sm max-w-lg mx-auto mb-4">Fill this to complete your registration</p><p class="text-black text-sm max-w-lg mx-auto mb-6">Your <span class="font-semibold">BADGE OF COMMUNAL</span> will be sent directly to your personal email address.</p></div><div class="max-w-2xl mx-auto space-y-6">
            <div><label for="name" class="text-black font-light small-caps">Full Name *</label><input data-input="registration" type="text" id="name" value="${state.registrationData.name}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="phone" class="text-black font-light small-caps">Phone Number *</label><input data-input="registration" type="tel" id="phone" value="${state.registrationData.phone}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="personalEmail" class="text-black font-light small-caps">Personal Email *</label><input data-input="registration" type="email" id="personalEmail" value="${state.registrationData.personalEmail}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="universityEmail" class="text-black font-light small-caps">University Email</label><input data-input="registration" type="email" id="universityEmail" value="${state.registrationData.universityEmail}" placeholder="student.annauniv.edu" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 text-sm no-rounded focus:border-[#8B0909] focus:ring-0" /></div>
            <button data-action="submit-registration" ${!isFormValid ? 'disabled' : ''} class="bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded w-full font-bold small-caps disabled:opacity-50 disabled:cursor-not-allowed">COMPLETE SURVEY</button>
        </div></div>`;
    };
    const getCompletedHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Thank you.</h1><div class="text-black text-base md:text-lg max-w-2xl"><p>We sincerely appreciate your time, insights, and thoughtful participation in this survey. You have earned the <span class="font-semibold text-[#8B0909]">Badge of Communal</span> and are now an <span class="font-semibold text-[#8B0909]">official member</span> of the REDMOON wardrobe community.</p></div><div class="text-black text-xs sm:text-sm max-w-2xl"><p>Your responses will help us create the perfect REDMOON collection that truly represents MIT's unique fashion identity. Expect exclusive updates and early access to our launch collection.</p></div><div class="text-black text-xs small-caps max-w-2xl mt-8"><p>To learn more about REDMOON's journey and why it started, please <span data-action="learn-more" class="underline cursor-pointer">click here</span>.</p></div></div></div><div><div class="text-black text-xs space-y-2"><p>2025 REDMOON, Official Merchandise of MIT</p><p>For Queries contact redmoon.mit@gmail.com</p></div></div></div>`;

    // --- EVENT HANDLING ---
    root.addEventListener('click', async (e) => {
        const action = e.target.dataset.action;
        if (!action) return;

        if (action === 'start-survey') {
            logSurveyStart(state.ipAddress, state.surveyId);
            handleStageChange('TSHIRT_SELECTION');
        }
        if (action === 'toggle-tshirt') {
            const id = e.target.dataset.id;
            if (state.selectedTShirts.includes(id)) {
                state.selectedTShirts = state.selectedTShirts.filter(tId => tId !== id);
            } else {
                state.selectedTShirts.push(id);
            }
            render();
        }
        if (action === 'finalize-tshirts') {
            submitTshirtSelection(state.ipAddress, state.surveyId, state.selectedTShirts);
            handleStageChange('PREFERENCES_INTRO', 2000);
        }
        if (action === 'start-questions') {
            logPreferencesIntroClick(state.ipAddress, state.surveyId);
            handleStageChange('QUESTIONS');
        }
        if (action === 'answer-question') {
            const answer = e.target.dataset.answer;
            const currentQuestion = QUESTIONS[state.questionIndex];
            state.answers[currentQuestion.id] = answer;
            if (state.questionIndex < QUESTIONS.length - 1) {
                state.questionIndex++;
                render();
            } else {
                submitQuestionAnswers(state.ipAddress, state.surveyId, state.answers);
                handleStageChange('REGISTRATION_INTRO');
            }
        }
        if (action === 'submit-text-answer') {
            const currentQuestion = QUESTIONS[state.questionIndex];
            state.answers[currentQuestion.id] = state.textAnswer.trim() || 'No input provided';
            submitQuestionAnswers(state.ipAddress, state.surveyId, state.answers);
            handleStageChange('REGISTRATION_INTRO');
        }
        if (action === 'start-registration') {
            logRegistrationIntroClick(state.ipAddress, state.surveyId);
            handleStageChange('REGISTRATION');
        }
        if (action === 'submit-registration') {
            state.loading = true;
            render();
            try {
                await submitRegistrationData(state.ipAddress, state.surveyId, state.registrationData);
                handleStageChange('COMPLETED', 1000);
            } catch (error) {
                alert("There was an error submitting your registration. Please try again.");
                state.loading = false;
                render();
            }
        }
        if(action === 'learn-more') {
            logCompletedPageClick(state.ipAddress, state.surveyId);
            // Optionally redirect: window.open('https://your-url.com', '_blank');
        }
    });

    root.addEventListener('input', (e) => {
        const inputType = e.target.dataset.input;
        if (inputType === 'registration') {
            state.registrationData[e.target.id] = e.target.value;
            const button = root.querySelector('[data-action="submit-registration"]');
            if (button) {
                const { name, phone, personalEmail } = state.registrationData;
                const isEmailValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
                const isFormValid = name.trim() !== '' && phone.trim() !== '' && isEmailValid(personalEmail);
                button.disabled = !isFormValid;
            }
        }
        if (inputType === 'text-answer') {
            state.textAnswer = e.target.value;
        }
    });

    // --- INITIALIZATION ---
    const init = async () => {
        // Global error handler
        window.addEventListener('error', (event) => {
            trackError(state.surveyId, event.message, event.error?.stack);
        });

        // Fetch IP
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            state.ipAddress = data.ip;
        } catch (error) {
            console.error('Failed to fetch IP address', error);
            state.ipAddress = 'unknown';
        } finally {
            state.loading = false;
            render();
        }
    };

    init();
});