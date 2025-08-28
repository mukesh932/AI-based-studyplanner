document.addEventListener('DOMContentLoaded', function() {
    // Toggle between file and URL upload
    const fileInput = document.getElementById('file');
    const urlInput = document.getElementById('url');
    
    fileInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            urlInput.classList.add('hidden');
        }
    });
    
    urlInput.addEventListener('focus', function() {
        fileInput.value = '';
        fileInput.classList.add('hidden');
        this.classList.remove('hidden');
    });

    // Handle material selection
    const materialItems = document.querySelectorAll('.material-item');
    materialItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all items
            materialItems.forEach(i => i.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Set material ID in all forms
            const materialId = this.dataset.id;
            document.getElementById('materialId').value = materialId;
            document.getElementById('quizMaterialId').value = materialId;
            document.getElementById('feedbackMaterialId').value = materialId;
            
            // Load study plan
            loadStudyPlan(materialId);
        });
    });

    // Upload form submission
    const uploadForm = document.getElementById('uploadForm');
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const fileInput = document.getElementById('file');
        
        // If no file selected but URL is provided
        if (fileInput.files.length === 0 && urlInput.value.trim() === '') {
            alert('Please select a file or enter a URL');
            return;
        }
        
        // If URL is provided, add it to formData
        if (urlInput.value.trim() !== '') {
            formData.append('file', urlInput.value.trim());
        }
        
        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Reload the page to show the new material
                window.location.reload();
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred during upload');
        });
    });

    // Ask question form
    const askForm = document.getElementById('askForm');
    const answerContainer = document.getElementById('answerContainer');
    const answerText = document.getElementById('answerText');
    
    askForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const materialId = document.getElementById('materialId').value;
        if (!materialId) {
            alert('Please select a material first');
            return;
        }
        
        const formData = new FormData(this);
        
        fetch('/ask', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                answerText.textContent = data.answer;
                answerContainer.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while asking the question');
        });
    });

    // Generate quiz form
    const quizForm = document.getElementById('quizForm');
    const quizContainer = document.getElementById('quizContainer');
    
    quizForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const materialId = document.getElementById('quizMaterialId').value;
        if (!materialId) {
            alert('Please select a material first');
            return;
        }
        
        const formData = new FormData(this);
        
        fetch('/generate_quiz', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayQuiz(data.quiz);
                quizContainer.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while generating the quiz');
        });
    });

    // Video resources form
    const videoForm = document.getElementById('videoForm');
    const videoResults = document.getElementById('videoResults');
    
    videoForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        
        fetch('/get_videos', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayVideos(data.videos);
                videoResults.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while searching for videos');
        });
    });

    // Feedback form
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackContainer = document.getElementById('feedbackContainer');
    
    feedbackForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const materialId = document.getElementById('feedbackMaterialId').value;
        if (!materialId) {
            alert('Please select a material first');
            return;
        }
        
        const formData = new FormData(this);
        
        fetch('/feedback', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                displayFeedback(data.feedback);
                feedbackContainer.classList.remove('hidden');
            } else {
                alert('Error: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while getting feedback');
        });
    });

    // Helper function to load study plan
    function loadStudyPlan(materialId) {
        fetch(`/get_study_plan?material_id=${materialId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayStudyPlan(data.study_plan);
                } else {
                    throw new Error(data.error || 'Failed to load study plan');
                }
            })
            .catch(error => {
                console.error('Error loading study plan:', error);
                alert('Error loading study plan: ' + error.message);
                
                // Show error in the study plan container
                const container = document.getElementById('studyPlanContainer');
                container.innerHTML = `
                    <div class="bg-red-50 border border-red-200 p-4 rounded-md">
                        <h3 class="font-medium text-red-800">Error Loading Study Plan</h3>
                        <p class="text-red-600">${error.message}</p>
                        <p class="text-sm mt-2">Please try again or upload a different file.</p>
                    </div>
                `;
            });
    }
    
    function displayStudyPlan(studyPlan) {
        const container = document.getElementById('studyPlanContainer');
        
        try {
            if (!studyPlan || !Array.isArray(studyPlan) || studyPlan.length === 0) {
                throw new Error('No valid study plan data received');
            }
    
            let html = `
                <div class="mb-4">
                    <h3 class="font-semibold text-lg mb-2">Your Personalized Study Plan</h3>
                    <div class="bg-blue-50 p-4 rounded-md mb-4">
                        <p class="text-blue-800"><strong>Start Date:</strong> ${studyPlan[0].date}</p>
                        <p class="text-blue-800"><strong>End Date:</strong> ${studyPlan[studyPlan.length - 1].date}</p>
                    </div>
                </div>
                <div class="space-y-4">
            `;
            
            studyPlan.forEach((day, index) => {
                if (!day.date || !day.content) {
                    throw new Error('Invalid study plan day format');
                }
                
                html += `
                    <div class="border border-gray-200 rounded-md p-4">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="font-medium">Day ${index + 1}: ${day.date}</h4>
                            <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                ${day.duration_hours || 0.5} hrs
                            </span>
                        </div>
                        <p class="text-gray-700">${day.content || 'No content for this day'}</p>
                    </div>
                `;
            });
            
            html += '</div>';
            container.innerHTML = html;
            
        } catch (error) {
            console.error('Error displaying study plan:', error);
            container.innerHTML = `
                <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                    <h3 class="font-medium text-yellow-800">Study Plan Display Error</h3>
                    <p class="text-yellow-600">${error.message}</p>
                    <p class="text-sm mt-2">The content may be in an unexpected format.</p>
                </div>
            `;
        }
    }

    // Helper function to display quiz
    function displayQuiz(quiz) {
        let html = '<h3 class="font-semibold mb-4">Generated Quiz</h3>';
        
        quiz.forEach((question, qIndex) => {
            html += `
                <div class="quiz-question">
                    <p class="font-medium mb-2">${qIndex + 1}. ${question.question}</p>
                    <div class="space-y-2">
            `;
            
            question.options.forEach((option, oIndex) => {
                const optionLetter = String.fromCharCode(65 + oIndex);
                html += `
                    <div class="quiz-option" data-question="${qIndex}" data-option="${optionLetter}">
                        ${optionLetter}) ${option}
                    </div>
                `;
            });
            
            html += `
                    </div>
                    <div class="correct-answer mt-2 text-sm text-green-600 hidden">
                        Correct answer: ${question.correct_answer}
                    </div>
                </div>
            `;
        });
        
        quizContainer.innerHTML = html;
        
        // Add click handlers for quiz options
        document.querySelectorAll('.quiz-option').forEach(option => {
            option.addEventListener('click', function() {
                const questionIndex = this.dataset.question;
                const optionLetter = this.dataset.option;
                const correctAnswer = quiz[questionIndex].correct_answer;
                
                // Show all correct answers for this question
                document.querySelectorAll(`.quiz-question:nth-child(${parseInt(questionIndex) + 1}) .correct-answer`)
                    .forEach(el => el.classList.remove('hidden'));
                
                // Mark options as correct/incorrect
                if (optionLetter === correctAnswer) {
                    this.classList.add('correct');
                } else {
                    this.classList.add('incorrect');
                    document.querySelector(`.quiz-question:nth-child(${parseInt(questionIndex) + 1}) .quiz-option[data-option="${correctAnswer}"]`)
                        .classList.add('correct');
                }
                
                // Disable further clicks on this question
                document.querySelectorAll(`.quiz-question:nth-child(${parseInt(questionIndex) + 1}) .quiz-option`)
                    .forEach(el => el.style.pointerEvents = 'none');
            });
        });
    }

    // Helper function to display videos
    function displayVideos(videos) {
        let html = '<h3 class="font-semibold mb-4">Recommended Videos</h3>';
        
        if (videos.length === 0) {
            html += '<p class="text-gray-500">No videos found for this topic.</p>';
        } else {
            html += '<div class="space-y-4">';
            
            videos.forEach(video => {
                html += `
                    <div class="border border-gray-200 rounded-md p-3">
                        <h4 class="font-medium">${video.title}</h4>
                        <p class="text-sm text-gray-600 mb-2">${video.channel}</p>
                        <a href="${video.url}" target="_blank" class="text-blue-600 hover:underline text-sm">Watch Video</a>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        videoResults.innerHTML = html;
    }

    // Helper function to display feedback
    function displayFeedback(feedback) {
        let html = `
            <h3 class="font-semibold mb-4">Your Progress Feedback</h3>
            <div class="space-y-4">
                <div>
                    <div class="flex justify-between mb-1">
                        <span class="font-medium">Progress</span>
                        <span class="font-medium">${feedback.progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${feedback.progress}%"></div>
                    </div>
                </div>
                
                <div class="bg-${feedback.on_track ? 'green' : 'yellow'}-50 p-4 rounded-md">
                    <p class="font-medium text-${feedback.on_track ? 'green' : 'yellow'}-800">
                        ${feedback.on_track ? 'You are on track!' : 'You need to catch up!'}
                    </p>
                    <p class="text-sm mt-1">${feedback.days_remaining} days remaining until ${feedback.estimated_completion}</p>
                </div>
                
                <div>
                    <h4 class="font-medium mb-2">Suggestions:</h4>
                    <ul class="list-disc pl-5 space-y-1">
        `;
        
        feedback.suggestions.forEach(suggestion => {
            html += `<li>${suggestion}</li>`;
        });
        
        html += `
                    </ul>
                </div>
            </div>
        `;
        
        feedbackContainer.innerHTML = html;
    }
});