
// Constants
const TIMEOUTS = {
    FAST: 1000,
    MEDIUM: 1500,
    SLOW: 2000
};

const AI_STRATEGIES = {
    TOSS_CHOICE: ['bat', 'bowl'], // Equal probability for both
    BALANCED: true
};

// Game State
let gameState = {
    phase: 'welcome',
    player1: { score: 0, role: '', isBatting: false },
    player2: { score: 0, role: '', isBatting: false },
    toss: { choice: '', playerNum: null, systemNum: null, winner: null },
    currentInnings: 1,
    selectedNumber: null,
    target: 0,
    gameOver: false,
    firstInningsScore: 0,
    firstInningsBatsman: null,
    isProcessingTurn: false,
    eventListeners: [],

    // ADD THESE:
    timeouts: new Set(),        // Track all timeouts for cleanup
    errorTimeout: null,         // Track error message timeout specifically
    lastActionTime: 0           // Prevent rapid clicking (debouncing)
};

// Utility Functions
function hideAllCards() {
    const cards = ['welcomeCard', 'tossCard', 'choiceCard', 'inningsCard', 'resultCard'];
    cards.forEach(card => {
        const element = document.getElementById(card);
        if (element) {
            element.classList.add('hidden');
            element.classList.remove('fade-in', 'pulse');
        }
    });
}

function showCard(cardId) {
    try {
        hideAllCards();
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.remove('hidden');
            card.classList.add('fade-in');

            // Show score card for gameplay phases
            if (['tossCard', 'choiceCard', 'inningsCard'].includes(cardId)) {
                const scoreCard = document.getElementById('scoreCard');
                if (scoreCard) {
                    scoreCard.classList.remove('hidden');
                }
            }

            // Focus management for accessibility
            setTimeout(() => {
                const firstButton = card.querySelector('button:not([disabled])');
                if (firstButton && document.activeElement === document.body) {
                    firstButton.focus();
                }
            }, 100);
        }
    } catch (error) {
        console.error('Error showing card:', error);
    }
}

function showError(message, duration = 4000) {
    try {
        const errorElement = document.getElementById('tossError');
        const textElement = document.getElementById('tossErrorText');

        if (errorElement && textElement) {
            textElement.textContent = message;
            errorElement.classList.remove('hidden');

            // Clear existing timeout
            if (gameState.errorTimeout) {
                clearTimeout(gameState.errorTimeout);
            }

            gameState.errorTimeout = setTimeout(() => {
                errorElement.classList.add('hidden');
            }, duration);
        }
    } catch (error) {
        console.error('Error showing error message:', error);
    }
}

function updateScoreDisplay() {
    try {
        const p1ScoreEl = document.getElementById('player1Score');
        const p2ScoreEl = document.getElementById('player2Score');
        const p1Status = document.getElementById('player1Status');
        const p2Status = document.getElementById('player2Status');

        if (p1ScoreEl) p1ScoreEl.textContent = gameState.player1.score;
        if (p2ScoreEl) p2ScoreEl.textContent = gameState.player2.score;

        // Update status badges
        if (p1Status && p2Status) {
            if (gameState.phase === 'innings') {
                if (gameState.player1.isBatting) {
                    p1Status.textContent = 'BATTING';
                    p1Status.className = 'status-badge batting-badge';
                    p2Status.textContent = 'BOWLING';
                    p2Status.className = 'status-badge bowling-badge';
                } else {
                    p1Status.textContent = 'BOWLING';
                    p1Status.className = 'status-badge bowling-badge';
                    p2Status.textContent = 'BATTING';
                    p2Status.className = 'status-badge batting-badge';
                }
            } else {
                p1Status.textContent = 'Ready';
                p1Status.className = 'status-badge ready-badge';
                p2Status.textContent = 'Ready';
                p2Status.className = 'status-badge ready-badge';
            }
        }
    } catch (error) {
        console.error('Error updating score display:', error);
    }
}

function clearSelections() {
    try {
        // Clear all button selections
        document.querySelectorAll('.btn-choice').forEach(btn => {
            btn.classList.remove('selected');
        });

        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Reset game state
        gameState.selectedNumber = null;

        // Disable play button
        const playBtn = document.getElementById('playTurnBtn');
        if (playBtn) {
            playBtn.disabled = true;
        }
    } catch (error) {
        console.error('Error clearing selections:', error);
    }
}

function setLoadingState(buttonId, textId, isLoading) {
    try {
        const button = document.getElementById(buttonId);
        const text = document.getElementById(textId);

        if (button && text) {
            button.disabled = isLoading;
            if (isLoading) {
                text.innerHTML = '<span class="loading-spinner"></span>Processing...';
            } else {
                // Reset to original text based on button
                if (buttonId === 'tossBtn') {
                    text.textContent = 'Do Toss';
                } else if (buttonId === 'playTurnBtn') {
                    text.textContent = 'Play Turn';
                }
            }
        }
    } catch (error) {
        console.error('Error setting loading state:', error);
    }
}

function cleanupDynamicElements() {
    try {
        // Remove any dynamically added info cards
        const tossSection = document.getElementById('tossCard')?.querySelector('.game-section');
        if (tossSection) {
            const dynamicInfoCards = tossSection.querySelectorAll('.info-card:not(#tossError)');
            dynamicInfoCards.forEach(card => card.remove());
        }
    } catch (error) {
        console.error('Error cleaning up dynamic elements:', error);
    }
}

// Game Functions
function startGame() {
    try {
        gameState.phase = 'toss';
        showCard('tossCard');
        updateScoreDisplay();
    } catch (error) {
        console.error('Error starting game:', error);
    }
}

function selectOddEven(choice, event) {
    try {
        gameState.toss.choice = choice;

        // Update button states
        document.querySelectorAll('#tossCard .btn-choice').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Find and select the clicked button
        if (event && event.target) {
            event.target.classList.add('selected');
        }

        // Hide error if showing
        const errorElement = document.getElementById('tossError');
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error selecting odd/even:', error);
    }
}

function doToss() {
    try {
        // Prevent multiple clicks
        if (gameState.isProcessingTurn) return;
        gameState.isProcessingTurn = true;

        setLoadingState('tossBtn', 'tossBtnText', true);

        const tossInput = document.getElementById('tossNumber');
        const playerNum = parseInt(tossInput.value);

        // Validation
        if (!gameState.toss.choice) {
            showError('Please select Odd or Even first!');
            setLoadingState('tossBtn', 'tossBtnText', false);
            gameState.isProcessingTurn = false;
            return;
        }

        if (!playerNum || playerNum < 1 || playerNum > 10 || !Number.isInteger(playerNum)) {
            showError('Please enter a valid whole number between 1 and 10!');
            setLoadingState('tossBtn', 'tossBtnText', false);
            gameState.isProcessingTurn = false;
            return;
        }

        gameState.toss.playerNum = playerNum;
        gameState.toss.systemNum = Math.floor(Math.random() * 10) + 1;

        const total = gameState.toss.playerNum + gameState.toss.systemNum;
        const isOdd = total % 2 === 1;
        const tossResult = isOdd ? 'odd' : 'even';

        gameState.toss.winner = (gameState.toss.choice === tossResult) ? 'player1' : 'player2';

        // Show toss result immediately
        const resultDiv = document.getElementById('tossResult');
        if (resultDiv) {
            resultDiv.innerHTML = `
            <div class="toss-numbers">
                <div>
                    <div class="toss-label">You</div>
                    <div class="toss-number">${gameState.toss.playerNum}</div>
                </div>
                <div>
                    <div class="toss-label">AI</div>
                    <div class="toss-number">${gameState.toss.systemNum}</div>
                </div>
            </div>
            <div style="margin-top: 15px;">
                <strong>Total: ${total} (${tossResult.toUpperCase()})</strong><br>
                <span style="color: ${gameState.toss.winner === 'player1' ? '#10b981' : '#ef4444'}; font-weight: 600;">
                    ${gameState.toss.winner === 'player1' ? 'You won the toss!' : 'AI won the toss!'}
                </span>
            </div>
        `;
            resultDiv.classList.remove('hidden');
        }

        // FIXED: Properly track the timeout
        const timeoutId1 = setTimeout(() => {
            if (gameState.toss.winner === 'player1') {
                // Player won the toss – show choice buttons
                showCard('choiceCard');
                setLoadingState('tossBtn', 'tossBtnText', false);
                gameState.isProcessingTurn = false;
            } else {
                // AI won the toss – delay decision for clarity
                const systemChoices = ['bat', 'bowl'];
                const systemChoice = systemChoices[Math.floor(Math.random() * systemChoices.length)];

                const aiDecisionEl = document.getElementById('aiDecisionMsg');
                if (aiDecisionEl) {
                    aiDecisionEl.innerHTML = `<i class="fas fa-robot me-2"></i>AI chose to <strong>${systemChoice.toUpperCase()}</strong> first!`;
                    aiDecisionEl.classList.remove('hidden');
                    aiDecisionEl.classList.add('show');
                }

                // FIXED: Properly track the nested timeout
                const timeoutId2 = setTimeout(() => {
                    chooseBatBowl(systemChoice, true);
                    if (aiDecisionEl) {
                        aiDecisionEl.classList.remove('show');
                        aiDecisionEl.classList.add('hidden');
                    }

                    setLoadingState('tossBtn', 'tossBtnText', false);
                    gameState.isProcessingTurn = false;

                    // Remove from tracking when completed
                    gameState.timeouts.delete(timeoutId2);
                }, 3000);

                // Track the nested timeout
                gameState.timeouts.add(timeoutId2);
            }

            // Remove from tracking when completed
            gameState.timeouts.delete(timeoutId1);
        }, TIMEOUTS.FAST);

        // FIXED: Track the main timeout
        gameState.timeouts.add(timeoutId1);

    } catch (error) {
        console.error('Error in toss:', error);
        setLoadingState('tossBtn', 'tossBtnText', false);
        gameState.isProcessingTurn = false;
    }
}


function chooseBatBowl(choice, isSystemChoice = false) {
    try {
        if (isSystemChoice) {
            // AI made the choice
            gameState.player2.role = choice;
            gameState.player1.role = choice === 'bat' ? 'bowl' : 'bat';
            gameState.player2.isBatting = choice === 'bat';
            gameState.player1.isBatting = choice === 'bowl';
        } else {
            // Player made the choice
            gameState.player1.role = choice;
            gameState.player2.role = choice === 'bat' ? 'bowl' : 'bat';
            gameState.player1.isBatting = choice === 'bat';
            gameState.player2.isBatting = choice === 'bowl';
        }

        gameState.phase = 'innings';

        // Set first innings batsman for target calculation
        gameState.firstInningsBatsman = gameState.player1.isBatting ? 'player1' : 'player2';

        updateInningsDisplay();
        showCard('inningsCard');
        updateScoreDisplay();
        clearSelections();
    } catch (error) {
        console.error('Error choosing bat/bowl:', error);
    }
}


function updateInningsDisplay() {
    try {
        const inningsText = document.getElementById('inningsText');
        const targetInfo = document.getElementById('targetInfo');
        const declareBtn = document.getElementById('declareBtn');
        const targetText = document.getElementById('targetText');

        if (!inningsText || !targetInfo || !declareBtn || !targetText) return;

        if (gameState.currentInnings === 1) {
            // First innings message
            if (gameState.player1.isBatting) {
                inningsText.innerHTML = `<i class="fas fa-play-circle icon"></i>First Innings: You are batting first!`;
            } else {
                inningsText.innerHTML = `<i class="fas fa-play-circle icon"></i>First Innings: You are bowling first! (AI is batting)`;
            }

            // Hide target info in first innings
            targetInfo.classList.add('hidden');

            // Show declare only if player is batting and has scored
            if (gameState.player1.isBatting && gameState.player1.score > 0) {
                declareBtn.classList.remove('hidden');
            } else {
                declareBtn.classList.add('hidden');
            }

        } else {
            // Second innings logic
            const currentScore = gameState.player1.isBatting ? gameState.player1.score : gameState.player2.score;
            const runsNeeded = gameState.target - currentScore + 1;

            if (runsNeeded <= 0) {
                endGame();
                return;
            }

            if (gameState.player1.isBatting) {
                inningsText.innerHTML = `<i class="fas fa-target icon"></i>Second Innings: You need ${runsNeeded} more run${runsNeeded > 1 ? 's' : ''} to win!`;
            } else {
                inningsText.innerHTML = `<i class="fas fa-target icon"></i>Second Innings: You are bowling! AI needs ${runsNeeded} more run${runsNeeded > 1 ? 's' : ''} to win!`;
            }

            targetInfo.classList.remove('hidden');
            targetText.textContent = `Target to chase: ${gameState.target + 1}`;

            // Hide declare in second innings
            declareBtn.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error updating innings display:', error);
    }
}

function selectNumber(num, event) {
    try {
        // Prevent selection if turn is being processed
        if (gameState.isProcessingTurn) return;

        gameState.selectedNumber = num;

        // Update button states
        document.querySelectorAll('.number-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Find and select the clicked button
        if (event && event.target) {
            event.target.classList.add('selected');
        }

        const playBtn = document.getElementById('playTurnBtn');
        if (playBtn) {
            playBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error selecting number:', error);
    }
}

function playTurn() {
    try {
        if (!gameState.selectedNumber || gameState.isProcessingTurn) {
            return;
        }

        // Prevent multiple clicks
        gameState.isProcessingTurn = true;
        setLoadingState('playTurnBtn', 'playBtnText', true);

        const numberBtns = document.querySelectorAll('.number-btn');
        numberBtns.forEach(btn => btn.disabled = true);

        const playerChoice = gameState.selectedNumber;
        const systemChoice = Math.floor(Math.random() * 10) + 1;
        const resultDiv = document.getElementById('turnResult');

        if (!resultDiv) return;

        if (playerChoice === systemChoice) {
            // OUT! - Show result immediately
            resultDiv.innerHTML = `
                <div class="toss-numbers">
                    <div>
                        <div class="toss-label">You</div>
                        <div class="toss-number">${playerChoice}</div>
                    </div>
                    <div>
                        <div class="toss-label">AI</div>
                        <div class="toss-number">${systemChoice}</div>
                    </div>
                </div>
                <div class="info-card danger" style="margin-top: 15px;">
                    <i class="fas fa-exclamation-triangle icon"></i>
                    <strong>OUT! Numbers matched - ${gameState.player1.isBatting ? 'You are' : 'AI is'} out!</strong>
                </div>
            `;
            resultDiv.classList.remove('hidden');

            setTimeout(() => {
                gameState.isProcessingTurn = false;
                setLoadingState('playTurnBtn', 'playBtnText', false);
                numberBtns.forEach(btn => btn.disabled = false);
                clearSelections();
                switchInnings();
            }, TIMEOUTS.FAST);
        } else {
            // Safe - add runs for the batting player
            let runsScored = 0;
            if (gameState.player1.isBatting) {
                runsScored = playerChoice;
                gameState.player1.score += playerChoice;
            } else {
                runsScored = systemChoice;
                gameState.player2.score += systemChoice;
            }

            resultDiv.innerHTML = `
                <div class="toss-numbers">
                    <div>
                        <div class="toss-label">You</div>
                        <div class="toss-number">${playerChoice}</div>
                    </div>
                    <div>
                        <div class="toss-label">AI</div>
                        <div class="toss-number">${systemChoice}</div>
                    </div>
                </div>
                <div class="info-card success" style="margin-top: 15px;">
                    <i class="fas fa-check-circle icon"></i>
                    <strong>Safe! ${gameState.player1.isBatting ? 'You' : 'AI'} scored ${runsScored} runs</strong>
                </div>
            `;
            resultDiv.classList.remove('hidden');

            // Check if target is reached in second innings
            if (gameState.currentInnings === 2) {
                const chasingScore = gameState.player1.isBatting ? gameState.player1.score : gameState.player2.score;
                if (chasingScore > gameState.target) {
                    updateScoreDisplay();
                    setTimeout(() => {
                        endGame();
                    }, TIMEOUTS.FAST);
                    return;
                }
            }

            // ✅ Safe case cleanup
            gameState.isProcessingTurn = false;
            setLoadingState('playTurnBtn', 'playBtnText', false);
            numberBtns.forEach(btn => btn.disabled = false);
            clearSelections();
            updateInningsDisplay();
        }

        updateScoreDisplay();

    } catch (error) {
        console.error('Error playing turn:', error);
        gameState.isProcessingTurn = false;
        setLoadingState('playTurnBtn', 'playBtnText', false);
        document.querySelectorAll('.number-btn').forEach(btn => btn.disabled = false);
    }
}

function declareInnings() {
    try {
        if (gameState.isProcessingTurn) return;

        const resultDiv = document.getElementById('turnResult');
        if (resultDiv) {
            resultDiv.innerHTML = `
                        <div class="info-card" style="background: #fef3c7; border-color: #f59e0b;">
                            <i class="fas fa-flag icon"></i>
                            <strong>DECLARED! You ended your innings at ${gameState.player1.score} runs</strong>
                        </div>
                    `;
            resultDiv.classList.remove('hidden');
        }

        setTimeout(() => {
            switchInnings();
        }, TIMEOUTS.FAST);
    } catch (error) {
        console.error('Error declaring innings:', error);
    }
}

function switchInnings() {
    try {
        if (gameState.currentInnings === 1) {
            // Store first innings score properly
            if (gameState.firstInningsBatsman === 'player1') {
                gameState.firstInningsScore = gameState.player1.score;
            } else {
                gameState.firstInningsScore = gameState.player2.score;
            }

            // Set target as the first innings score
            gameState.target = gameState.firstInningsScore;
            gameState.currentInnings = 2;

            // Switch roles
            gameState.player1.isBatting = !gameState.player1.isBatting;
            gameState.player2.isBatting = !gameState.player2.isBatting;

            // Reset processing state and clear selections
            gameState.isProcessingTurn = false;
            setLoadingState('playTurnBtn', 'playBtnText', false);
            clearSelections();

            // Re-enable controls
            document.querySelectorAll('.number-btn').forEach(btn => btn.disabled = false);

            updateInningsDisplay();
            updateScoreDisplay();

            // Hide turn result
            const turnResult = document.getElementById('turnResult');
            if (turnResult) {
                turnResult.classList.add('hidden');
            }
        } else {
            // Game over - both innings completed
            endGame();
        }
    } catch (error) {
        console.error('Error switching innings:', error);
    }
}

function endGame() {
    try {
        gameState.gameOver = true;

        let winnerText;

        if (gameState.player1.score > gameState.player2.score) {
            winnerText = 'You Win!';
        } else if (gameState.player2.score > gameState.player1.score) {
            winnerText = 'AI Wins!';
        } else {
            winnerText = "It's a Tie!";
        }

        const winnerTextEl = document.getElementById('winnerText');
        const finalScoreEl = document.getElementById('finalScoreText');

        if (winnerTextEl) winnerTextEl.textContent = winnerText;
        if (finalScoreEl) finalScoreEl.textContent = `You: ${gameState.player1.score} | AI: ${gameState.player2.score}`;

        showCard('resultCard');
        const resultCard = document.getElementById('resultCard');
        if (resultCard) {
            resultCard.classList.add('pulse');
        }
    } catch (error) {
        console.error('Error ending game:', error);
    }
}

function resetGame() {
    try {
        // Clear all timeouts
        if (gameState.errorTimeout) {
            clearTimeout(gameState.errorTimeout);
        }

        // Remove all event listeners
        gameState.eventListeners.forEach(listener => {
            document.removeEventListener(listener.type, listener.handler);
        });
        gameState.eventListeners = [];

        // Reset game state
        Object.assign(gameState, {
            phase: 'welcome',
            player1: { score: 0, role: '', isBatting: false },
            player2: { score: 0, role: '', isBatting: false },
            toss: { choice: '', playerNum: null, systemNum: null, winner: null },
            currentInnings: 1,
            selectedNumber: null,
            target: 0,
            gameOver: false,
            firstInningsScore: 0,
            firstInningsBatsman: null,
            isProcessingTurn: false,
            eventListeners: []
        });

        // Reset form elements
        const tossNumber = document.getElementById('tossNumber');
        if (tossNumber) tossNumber.value = '';

        // Reset choice card title
        const choiceTitle = document.getElementById('choiceTitle');
        if (choiceTitle) {
            choiceTitle.textContent = 'You won the toss! Choose your action:';
        }

        // Clear all selections
        clearSelections();

        // Re-enable all buttons
        document.querySelectorAll('button').forEach(btn => {
            btn.disabled = false;
        });

        // Reset button texts
        setLoadingState('tossBtn', 'tossBtnText', false);
        setLoadingState('playTurnBtn', 'playBtnText', false);

        // Hide all error messages
        const errorElements = document.querySelectorAll('.info-card.error');
        errorElements.forEach(el => el.classList.add('hidden'));

        // Clean up dynamic elements
        cleanupDynamicElements();

        // Reset all displays
        const turnResult = document.getElementById('turnResult');
        const tossResult = document.getElementById('tossResult');
        const declareBtn = document.getElementById('declareBtn');
        const targetInfo = document.getElementById('targetInfo');

        if (turnResult) turnResult.classList.add('hidden');
        if (tossResult) tossResult.classList.add('hidden');
        if (declareBtn) declareBtn.classList.add('hidden');
        if (targetInfo) targetInfo.classList.add('hidden');

        // Hide score card and show welcome
        const scoreCard = document.getElementById('scoreCard');
        if (scoreCard) scoreCard.classList.add('hidden');

        showCard('welcomeCard');
        updateScoreDisplay();
    } catch (error) {
        console.error('Error resetting game:', error);
        // Force refresh if reset fails
        location.reload();
    }
}

// Input validation functions
function validateTossInput(input) {
    try {
        const value = parseFloat(input.value);

        // Check if it's a valid integer between 1-10
        if (isNaN(value) || !Number.isInteger(value) || value < 1 || value > 10) {
            input.setCustomValidity('Please enter a whole number between 1 and 10');
            showError('Please enter a whole number between 1 and 10!');
            return false;
        } else {
            input.setCustomValidity('');
            const errorElement = document.getElementById('tossError');
            if (errorElement) {
                errorElement.classList.add('hidden');
            }
            return true;
        }
    } catch (error) {
        console.error('Error validating toss input:', error);
        return false;
    }
}

// Initialize game when DOM is loaded
function initializeGame() {
    try {
        updateScoreDisplay();

        // Add input validation for toss number
        const tossInput = document.getElementById('tossNumber');
        if (tossInput) {
            const inputHandler = function (e) {
                validateTossInput(this);
            };

            const pasteHandler = function (e) {
                setTimeout(() => validateTossInput(this), 0);
            };

            tossInput.addEventListener('input', inputHandler);
            tossInput.addEventListener('paste', pasteHandler);

            // Store event listeners for cleanup
            gameState.eventListeners.push(
                { type: 'input', handler: inputHandler },
                { type: 'paste', handler: pasteHandler }
            );
        }

        // Add keyboard support
        const keyHandler = function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();

                // Handle Enter key based on current phase
                if (gameState.phase === 'toss') {
                    const tossBtn = document.getElementById('tossBtn');
                    if (tossBtn && !tossBtn.disabled) {
                        doToss();
                    }
                } else if (gameState.phase === 'innings') {
                    const playBtn = document.getElementById('playTurnBtn');
                    if (playBtn && !playBtn.disabled) {
                        playTurn();
                    }
                }
            }

            // Number key shortcuts for number selection
            if (gameState.phase === 'innings' && !gameState.isProcessingTurn) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 9) {
                    selectNumber(num);
                } else if (e.key === '0') {
                    selectNumber(10);
                }
            }
        };

        document.addEventListener('keydown', keyHandler);
        gameState.eventListeners.push({ type: 'keydown', handler: keyHandler });

        // Prevent zoom on iOS devices
        const metaViewport = document.querySelector('meta[name=viewport]');
        if (metaViewport) {
            metaViewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }

    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGame);
} else {
    initializeGame();
}

// Handle page visibility changes (prevent issues when tab becomes inactive)
document.addEventListener('visibilitychange', function () {
    if (!document.hidden && gameState.isProcessingTurn) {
        // Reset processing state if page becomes visible and stuck in processing
        setTimeout(() => {
            if (gameState.isProcessingTurn) {
                gameState.isProcessingTurn = false;
                setLoadingState('playTurnBtn', 'playBtnText', false);
                document.querySelectorAll('.number-btn').forEach(btn => btn.disabled = false);
            }
        }, 1000);
    }
});

// Handle window resize for responsive adjustments
let resizeTimeout;
window.addEventListener('resize', function () {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        // Force redraw to handle any layout issues
        const mainContainer = document.querySelector('.main-container');
        if (mainContainer) {
            mainContainer.style.display = 'none';
            mainContainer.offsetHeight; // Trigger reflow
            mainContainer.style.display = '';
        }
    }, 250);
});
