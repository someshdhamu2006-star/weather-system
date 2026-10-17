
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo 'Weather Forecast System'
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t weather-forecast-system:1.0 .'
            }
        }

        stage('Deploy Container') {
            steps {
                bat 'docker stop weather-jenkins || exit /b 0'
                bat 'docker rm weather-jenkins || exit /b 0'
                bat 'docker run -d --name weather-jenkins -p 8082:80 weather-forecast-system:1.0'
            }
        }
    }
}
