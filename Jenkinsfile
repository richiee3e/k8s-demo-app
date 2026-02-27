pipeline {
    agent any

    environment {
        AWS_REGION      = 'ap-south-1'
        AWS_ACCOUNT_ID  = '490157056549'
        ECR_FRONTEND    = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/k8s-demo-frontend"
        ECR_BACKEND     = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/k8s-demo-backend"
        IMAGE_TAG       = "${BUILD_NUMBER}"
        K8S_MASTER_IP   = '10.0.10.211'
    }

    stages {

        // ── Stage 1: Checkout code from GitHub ──
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Code checked out — Build #${BUILD_NUMBER}"
            }
        }

        // ── Stage 2: Login to ECR ──
        stage('ECR Login') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | \
                    docker login --username AWS --password-stdin \
                    ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
                """
                echo "✅ Logged in to ECR"
            }
        }

        // ── Stage 3: Build Docker images ──
        stage('Build Images') {
            parallel {
                stage('Build Frontend') {
                    steps {
                        sh """
                            docker build -t ${ECR_FRONTEND}:${IMAGE_TAG} \
                                         -t ${ECR_FRONTEND}:latest \
                                         ./frontend
                        """
                        echo "✅ Frontend image built"
                    }
                }
                stage('Build Backend') {
                    steps {
                        sh """
                            docker build -t ${ECR_BACKEND}:${IMAGE_TAG} \
                                         -t ${ECR_BACKEND}:latest \
                                         ./backend
                        """
                        echo "✅ Backend image built"
                    }
                }
            }
        }

        // ── Stage 4: Push images to ECR ──
        stage('Push to ECR') {
            parallel {
                stage('Push Frontend') {
                    steps {
                        sh """
                            docker push ${ECR_FRONTEND}:${IMAGE_TAG}
                            docker push ${ECR_FRONTEND}:latest
                        """
                        echo "✅ Frontend pushed to ECR"
                    }
                }
                stage('Push Backend') {
                    steps {
                        sh """
                            docker push ${ECR_BACKEND}:${IMAGE_TAG}
                            docker push ${ECR_BACKEND}:latest
                        """
                        echo "✅ Backend pushed to ECR"
                    }
                }
            }
        }

        // ── Stage 5: Deploy to Kubernetes ──
        stage('Deploy to K8s') {
            steps {
                sh """
                    # Replace image placeholders in manifests with real ECR URLs
                    sed -i 's|FRONTEND_IMAGE|${ECR_FRONTEND}:${IMAGE_TAG}|g' k8s/manifests.yaml
                    sed -i 's|BACKEND_IMAGE|${ECR_BACKEND}:${IMAGE_TAG}|g' k8s/manifests.yaml

                    # Apply manifests to K8s cluster via SSM on master node
                    aws ssm send-command \
                        --instance-ids $(aws ec2 describe-instances \
                            --filters "Name=tag:Role,Values=master" \
                                      "Name=instance-state-name,Values=running" \
                            --query "Reservations[0].Instances[0].InstanceId" \
                            --output text \
                            --region ${AWS_REGION}) \
                        --document-name "AWS-RunShellScript" \
                        --parameters commands=["kubectl apply -f /tmp/manifests.yaml"] \
                        --region ${AWS_REGION}
                """
                echo "✅ Deployed to Kubernetes"
            }
        }

        // ── Stage 6: Verify deployment ──
        stage('Verify') {
            steps {
                sh """
                    aws ssm send-command \
                        --instance-ids $(aws ec2 describe-instances \
                            --filters "Name=tag:Role,Values=master" \
                                      "Name=instance-state-name,Values=running" \
                            --query "Reservations[0].Instances[0].InstanceId" \
                            --output text \
                            --region ${AWS_REGION}) \
                        --document-name "AWS-RunShellScript" \
                        --parameters commands=["kubectl get pods -o wide"] \
                        --region ${AWS_REGION}
                """
                echo "✅ Deployment verified"
            }
        }
    }

    post {
        success {
            echo "🎉 Pipeline succeeded! App deployed to K8s."
        }
        failure {
            echo "❌ Pipeline failed. Check logs above."
        }
        always {
            // Clean up local Docker images to save disk space
            sh """
                docker rmi ${ECR_FRONTEND}:${IMAGE_TAG} || true
                docker rmi ${ECR_BACKEND}:${IMAGE_TAG} || true
            """
        }
    }
}
