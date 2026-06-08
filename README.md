🚀 CI/CD Pipeline — Jenkins, SonarQube, EKS, ArgoCD, Prometheus & Grafana
A production-grade DevOps project implementing a complete CI/CD pipeline for a library management application (gestion-biblio), deployed on AWS EKS using GitOps principles.

Live proof: Jenkins builds running ✅ | SonarQube quality gate passing ✅ | ArgoCD synced to EKS ✅ | Grafana monitoring active ✅


📦 Repositories
RepositoryPurposegestion-biblioApplication source code + Jenkinsfilegestion-biblio-gitopsGitOps repo — Kubernetes manifests (ArgoCD watches this)gestion-bibliothequeApplication source (TypeScript/JavaScript, 2.4k LOC)Docker HubPublished Docker image

🏗️ Architecture
Developer pushes code
        │
        ▼
┌───────────────────┐
│   GitHub Webhook  │  ──── triggers automatically on push
└────────┬──────────┘
         │
         ▼
┌───────────────────────────────────────────────┐
│              Jenkins CI Pipeline               │
│                                               │
│  1. Checkout code from GitHub                 │
│  2. Build Docker image                        │
│  3. Run SonarQube code quality analysis       │
│     └─ Quality Gate: PASSED ✅                │
│  4. Push image to Docker Hub                  │
│     └─ yescine0/gestion-bibliotheque         │
│  5. Update Kubernetes manifests               │
│     └─ Commits to gestion-biblio-gitops      │
│  6. Send email notification (success/fail)    │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│         ArgoCD (GitOps CD)                    │
│                                               │
│  Watches: gestion-biblio-gitops repo          │
│  Cluster: virtualtechbox-cluster (AWS EKS)    │
│  Sync Status: ✅ Synced to HEAD               │
│  Deploys: gestion-biblio-deployment + svc     │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│           AWS EKS Cluster                     │
│                                               │
│  Namespaces:                                  │
│  ├── default        (app pods)                │
│  ├── kube-system    (10 pods, 4 workloads)    │
│  └── prometheus     (8 pods, 6 workloads)     │
│                                               │
│  Monitoring Stack (via Helm):                 │
│  ├── Prometheus  → metrics collection         │
│  └── Grafana     → Kubernetes dashboards      │
│       CPU: 3.27% | Memory: 41.9%             │
└───────────────────────────────────────────────┘

🧰 Full Tech Stack
CategoryToolsInfrastructureTerraform, AWS EC2, AWS EKSCIJenkins 2.555, GitHub WebhooksCode QualitySonarQube Community v26.6ContainersDocker, Docker HubCD / GitOpsArgoCD v3.4.3OrchestrationKubernetes (AWS EKS)MonitoringHelm, Prometheus, GrafanaNotificationsJenkins Email ExtensionApplicationTypeScript, JavaScript (2.4k LOC)

📁 Project Structure
gestion-biblio/                   ← App + CI
├── .github/
├── Jenkinsfile                   ← Declarative pipeline
├── Dockerfile
├── sonar-project.properties      ← SonarQube config
└── src/

gestion-biblio-gitops/            ← GitOps / CD
├── deployment.yaml               ← K8s Deployment
└── service.yaml                  ← K8s Service

🔄 CI Pipeline Stages (Jenkinsfile)
groovypipeline {
  stages {
    stage('Checkout')       { /* Pull from GitHub */ }
    stage('Build Image')    { /* docker build */ }
    stage('SonarQube')      { /* Code quality scan */ }
    stage('Quality Gate')   { /* Fail if gate not passed */ }
    stage('Push to Hub')    { /* docker push yescine0/... */ }
    stage('Update GitOps')  { /* Commit new image tag to gitops repo */ }
  }
  post {
    always { emailext(...) }  // Notify on success or failure
  }
}
Latest runs:

Build #17 — ✅ Success (1 min 2 s)
Build #16 — ❌ Failed (3 min 28 s) → fixed and re-run


📊 SonarQube Analysis Results
Project: gestion-biblio-CI
MetricResultQuality Gate✅ PassedSecurityA (0 issues)ReliabilityC (27 issues)MaintainabilityA (29 issues)Duplications0.0%Lines of Code2,400+

📡 Monitoring — Prometheus + Grafana on EKS
Deployed via Helm into the prometheus namespace on EKS.
Grafana — Kubernetes / Compute Resources / Cluster dashboard:
MetricValueCPU Utilisation3.27%CPU Requests Commitment30.1%Memory Utilisation41.9%Memory Requests Commitment16.6%Memory Limits Commitment25.6%

🔁 ArgoCD — GitOps Deployment

App: gestion-biblio-app
Cluster: virtualtechbox-cluster (AWS EKS)
Source repo: gestion-biblio-gitops (HEAD)
Sync Status: ✅ Synced
Last Sync: Successful (triggered by Jenkins commit to gitops repo)

ArgoCD detects changes in the gitops repo and automatically reconciles the EKS cluster state.

🚀 How to Reproduce
1. Provision Infrastructure (Terraform)
bashcd terraform/
terraform init
terraform apply
# Creates: EC2 (Jenkins + SonarQube), EKS cluster
2. Configure Jenkins

Access: http://<EC2_IP>:8080
Install plugins: Pipeline, Git, SonarQube Scanner, Email Extension, Docker
Add credentials: GitHub token, Docker Hub, SonarQube token, EC2 SSH key

3. Configure SonarQube

Access: http://<EC2_IP>:9000
Create project gestion-biblio-CI
Integrate with Jenkins via webhook

4. Deploy EKS Monitoring (Helm)
bashhelm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n prometheus --create-namespace
5. Install ArgoCD on EKS
bashkubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
6. Connect ArgoCD to GitOps Repo

Add gestion-biblio-gitops as source repository
Create app pointing to virtualtechbox-cluster
ArgoCD will auto-deploy on every commit

7. Configure GitHub Webhook

Payload URL: http://<JENKINS_IP>:8080/github-webhook/
Events: push to main


🔐 Required Secrets / Credentials
SecretUsed byGITHUB_TOKENJenkins — checkout & gitops commitDOCKERHUB_CREDENTIALSJenkins — push imageSONAR_TOKENJenkins — SonarQube scanEMAIL_CREDENTIALSJenkins — notificationsAWS_ACCESS_KEY_IDTerraform — EKS provisioningAWS_SECRET_ACCESS_KEYTerraform — EKS provisioning
