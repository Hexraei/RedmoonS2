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
        { id: 'last_purchase', question: 'Your last ₹500+ clothing purchase was for?', options: ['Job/college interview', 'Social event', 'Festival shopping', 'For daily', 'I buy under ₹500'] },
        { id: 'bookmark_reason', question: 'What makes you bookmark clothing online?', options: ['Celebrity/influencer wore it', 'Friends buying it', 'Limited time discount', 'Looks premium', 'Good reviews'] },
        { id: 'shopping_trigger', question: 'When do you shop for clothes?', options: ['End of season sale', 'Month starting', 'Special occasion coming', 'Everyone has it (FOMO)', 'Based on my need'] },
        { id: 'price_perception', question: 'Seeing a ₹1000+ price tag, you think?', options: ['"Not worth it"', '"Wait for sale"', '"Check cheaper sites"', '"If quality is good..."', '"Screenshot for later"'] },
        { id: 'premium_motivation', question: "You'd pay premium for clothes if?", options: ['Viral on Instagram', 'Limited edition', 'Trusted brand', 'Quality and lifespan', "I won't pay premium"] },
        { id: 'frustrations', question: 'What frustrates you most about buying clothes right now?', options: ["Quality doesn't match the price", 'Everything looks the same', 'Size/Fit', 'Brands overpromise and underdeliver', 'Clothes wear out too quickly'] },
        { id: 'trust_factors', question: 'What makes you trust a new clothing brand enough to buy?', options: ['Social media Buzz', 'Quality visible in details', 'Honest reviews and transparency', 'Not overhyped and pricing', 'Original and timeless designs'] },
        { id: 'worth_it_factors', question: "When shopping for a T-shirt, what key factors make it feel 'worth it' to you? (Optional)", options: [], isText: true }
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
            if (error instanceof TypeError && error.message === 'Failed to fetch') {
              console.warn(`Caught 'Failed to fetch' for action "${action}", assuming success.`);
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
        return sendData('submitTshirtSelection', { ip, surveyId, ...tshirtData }, true);
    };
    const logPreferencesIntroClick = (ip, surveyId) => sendData('logPreferencesIntroClick', { ip, surveyId }, true).catch(e => console.warn(e));
    const submitQuestionAnswers = (ip, surveyId, answers) => sendData('submitQuestionAnswers', { ip, surveyId, ...answers }, true);
    const logRegistrationIntroClick = (ip, surveyId) => sendData('logRegistrationIntroClick', { ip, surveyId }, true).catch(e => console.warn(e));
    const submitRegistrationData = (ip, surveyId, registrationData) => sendData('submitRegistrationData', { ip, surveyId, ...registrationData }, true);
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
            case 'STORY': root.innerHTML = getStoryHTML(); break;
            default: root.innerHTML = getLandingHTML();
        }
    };

    const handleStageChange = (newStage, delay = 1000) => {
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
    const getLandingHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Fashion - Built by Your <span class="font-semibold text-[#8B0909]">Choice and Voice</span></h1><div class="text-black text-xs sm:text-sm max-w-lg"><p class="mb-4">Your opinion shapes our designs. Participate in this survey to co-create our next collection and earn the <span class="font-bold text-black">BADGE of LOYALTY</span>, unlocking a 40% discount and exclusive member perks.</p></div><button data-action="start-survey" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">START SURVEY ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
    const getTshirtSelectionHTML = () => {
        const cards = TSHIRT_DESIGNS.map(tshirt => {
            const isSelected = state.selectedTShirts.includes(tshirt.id);
            return `<div class="group">
                <div class="relative aspect-[4/5] overflow-hidden no-rounded" style="background-color: #f3f3f3;"><img src="${tshirt.frontImage}" alt="${tshirt.designName}" class="w-full h-full object-contain no-rounded transition-transform duration-300 group-hover:scale-105" /></div>
                <button data-action="toggle-tshirt" data-id="${tshirt.id}" class="w-full no-rounded small-caps text-sm py-2 mt-2 transition-colors ${isSelected ? 'bg-gray-400 text-black' : 'bg-black text-white hover:bg-gray-800'}">${isSelected ? 'Unselect' : 'Select'}</button>
            </div>`;
        }).join('');
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="text-center mb-4"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /><h2 class="text-2xl text-[#8B0909] mt-2 mb-4 font-bold small-caps tracking-wider">Official Survey</h2><p class="text-black text-sm md:text-base max-w-3xl mx-auto mb-4">REDMOON is built by you. Your selections on this page directly influence which designs we produce. Cast your vote and become a part of our design process.</p><p class="text-black text-xs md:text-sm">There is no limit to the number of designs you can select.</p></div><div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6 mb-8">${cards}</div><div class="text-center"><button data-action="finalize-tshirts" ${state.selectedTShirts.length === 0 ? 'disabled' : ''} class="bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded font-bold w-full max-w-2xl small-caps disabled:opacity-50 disabled:cursor-not-allowed">Submit Selections</button></div></div>`;
    };
    const getPreferencesIntroHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Share Your <span class="font-semibold text-[#8B0909]">Preferences</span></h1><div class="text-black text-xs sm:text-sm max-w-lg space-y-4"><p>Next, please answer a few short questions to help us refine the fit, feel, and design of our T-shirts.</p></div><button data-action="start-questions" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">CONTINUE ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
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
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="text-center mb-4"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /><h2 class="text-2xl text-[#8B0909] mt-2 mb-4 font-bold small-caps tracking-wider">Official Survey</h2><div class="grid grid-cols-8 gap-2 max-w-2xl mx-auto mb-8">${progressBars}</div></div><div class="max-w-2xl mx-auto"><div class="text-center"><h3 class="text-xl md:text-2xl text-black mb-8 font-light">${currentQuestion.question}</h3>${optionsHTML}</div></div></div>`;
    };
    const getRegistrationIntroHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Final Step: Claim Your <span class="font-semibold text-[#8B0909]">Badge of Loyalty</span></h1><div class="text-black text-xs sm:text-sm max-w-lg space-y-4"><p>As a thank you for your participation, please complete the form to secure your Badge and receive a <span class="font-bold text-black">40% discount</span> code for our launch.</p></div><button data-action="start-registration" class="text-black text-base md:text-lg underline hover:no-underline bg-transparent border-none p-0 cursor-pointer small-caps tracking-wider" style="text-decoration: underline; text-underline-offset: 4px;">PROCEED TO FORM ></button></div></div><div><p class="text-black text-xs sm:text-sm max-w-md font-medium">We value your data and privacy. All information collected is used solely to enhance our products and services.</p></div></div>`;
    const getRegistrationHTML = () => {
        const { name, phone, personalEmail } = state.registrationData;
        const isEmailValid = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        const isFormValid = name.trim() !== '' && phone.trim() !== '' && isEmailValid(personalEmail);
        return `<div class="container mx-auto px-4 sm:px-8 py-8 bg-white min-h-screen"><div class="text-center mb-4"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain mx-auto" /><h2 class="text-2xl text-[#8B0909] mt-2 mb-4 font-bold small-caps tracking-wider">Official Survey</h2><p class="text-black text-sm max-w-lg mx-auto mb-4">Please provide your details below to complete the survey.</p><p class="text-black text-sm max-w-lg mx-auto mb-6">Your <span class="font-semibold">BADGE of LOYALTY</span> and 40% discount will be sent directly to your personal email address.</p></div><div class="max-w-2xl mx-auto space-y-6">
            <div><label for="name" class="text-black font-light small-caps">Full Name *</label><input data-input="registration" type="text" id="name" value="${state.registrationData.name}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="phone" class="text-black font-light small-caps">Phone Number *</label><input data-input="registration" type="tel" id="phone" value="${state.registrationData.phone}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="personalEmail" class="text-black font-light small-caps">Personal Email *</label><input data-input="registration" type="email" id="personalEmail" value="${state.registrationData.personalEmail}" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 no-rounded focus:border-[#8B0909] focus:ring-0" required /></div>
            <div><label for="universityEmail" class="text-black font-light small-caps">University Email</label><input data-input="registration" type="email" id="universityEmail" value="${state.registrationData.universityEmail}" placeholder="student.annauniv.edu" class="w-full border border-[#8B0909] bg-white text-black px-3 py-2 mt-1 text-sm no-rounded focus:border-[#8B0909] focus:ring-0" /></div>
            <button data-action="submit-registration" ${!isFormValid ? 'disabled' : ''} class="bg-black text-white px-8 py-2 text-sm hover:bg-gray-800 no-rounded w-full font-bold small-caps disabled:opacity-50 disabled:cursor-not-allowed">COMPLETE SURVEY</button>
        </div></div>`;
    };
    const getCompletedHTML = () => `<div class="flex flex-col justify-between min-h-screen p-8 text-left bg-white"><div><div class="mb-12"><img src="./images/logo/redmoon_logo.png" alt="REDMOON" class="w-48 h-24 md:w-64 md:h-32 object-contain" /></div><div class="space-y-8 max-w-2xl"><h1 class="text-3xl md:text-5xl text-black font-light">Thank You for Your <span class="font-semibold text-[#8B0909]">Contribution</span></h1><div class="text-black text-base md:text-lg max-w-2xl"><p>We sincerely appreciate your time and thoughtful feedback. You have officially earned the <span class="font-semibold text-[#8B0909]">BADGE of LOYALTY</span>, granting you a 40% discount and exclusive offers at REDMOON.</p></div><div class="text-black text-xs small-caps max-w-2xl mt-8"><p>To learn more about REDMOON's journey and why it started, please <span data-action="learn-more" class="underline cursor-pointer">click here</span>.</p></div></div></div><div><div class="text-black text-xs space-y-2"><p>2025 REDMOON, Official Merchandise of MIT</p><p>For Queries contact redmoon.mit@gmail.com</p></div></div></div>`;
    const getStoryHTML = () => {
        return `<div class="bg-white text-black min-h-screen flex flex-col justify-start p-8">
                <div class="w-full flex justify-end">
                    <button data-action="back-to-completed" class="text-5xl font-thin text-gray-600 hover:text-black leading-none">&times;</button>
                </div>
                <div class="max-w-3xl mx-auto flex-grow w-full mt-4">
                    <h1 class="text-4xl md:text-5xl font-light mb-8 text-[#8B0909]">The Story of Redmoon</h1>
                    <div class="space-y-4 text-sm small-caps tracking-wider font-light max-h-[65vh] overflow-y-auto pr-4">
                        <p>Back in September 2025, we were sitting with a challenge from AUSEC: “Come up with a revolutionary solution to an everyday problem, and turn it into a business idea.” Sounds simple, right? Except when you actually sit down, every idea feels either too small or too big. After a lot of back-and-forth, one problem kept pulling our attention — fashion.</p>
                        <p>Here’s the thing: fashion today feels broken. On one side, there’s fast fashion — those t-shirts that look good for a season but fade, stretch, or tear before you know it. Cheap to buy, expensive for the planet. On the other side, there’s luxury fashion — and let’s be honest, half the time they’re selling basics at prices that feel more like a joke. We couldn’t stop asking ourselves: is there a way to do this differently? To make clothes that last, feel premium, but don’t make your wallet cry? We weren’t sure at first… but spoiler alert: it was possible.</p>
                        <p>That’s how Redmoon was born. A global fashion brand built on one simple idea — timeless clothes that people actually want to wear, again and again. No chasing trends, no over-the-top pricing, just premium quality at fair prices. We keep our margins small, because our goal isn’t squeezing profit — it’s building trust. And at the core, Redmoon isn’t really ours, it’s everyone’s. It’s shaped by the people who wear it, molded by their voices. We’re here to stand between disposable fast fashion and unreachable luxury, and to show there’s a better way. That’s the Redmoon story — and honestly, it’s only just starting.</p>
                    </div>
                </div>
            </div>`;
    };

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
            handleStageChange('PREFERENCES_INTRO', 2000);
            await submitTshirtSelection(state.ipAddress, state.surveyId, state.selectedTShirts);
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
                state.loading = true;
                render();
                await submitQuestionAnswers(state.ipAddress, state.surveyId, state.answers);
                handleStageChange('REGISTRATION_INTRO', 0);
            }
        }
        if (action === 'submit-text-answer') {
            const currentQuestion = QUESTIONS[state.questionIndex];
            state.answers[currentQuestion.id] = state.textAnswer.trim() || 'No input provided';

            state.loading = true;
            render();
            await submitQuestionAnswers(state.ipAddress, state.surveyId, state.answers);
            handleStageChange('REGISTRATION_INTRO', 0);
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
                alert("There was an error submitting your registration. Please check your connection and try again.");
                state.loading = false;
                render();
            }
        }
        if (action === 'learn-more') {
            e.preventDefault();
            logCompletedPageClick(state.ipAddress, state.surveyId);
            handleStageChange('STORY');
        }
        if (action === 'back-to-completed') {
            handleStageChange('COMPLETED');
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
