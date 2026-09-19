# Step Functions Orchestrator

## Overview

The `orchestrator.asl.json` file defines the **main workflow of the Self-Healing AWS Infrastructure system**.

Our project is designed to automatically detect infrastructure problems, use AI to diagnose the issue, wait for human approval, and then apply the appropriate fix.

The complete workflow is controlled by **AWS Step Functions**.

The `orchestrator.asl.json` file contains the instructions that tell Step Functions:

* Which Lambda function should run first
* What should happen after the diagnosis is completed
* How the workflow should wait for human approval
* What should happen if the user approves the proposed fix
* What should happen if the user rejects the fix
* How the workflow should handle failures

---

## Overall Workflow

The system follows this workflow:

```text
AWS Problem Detected
        │
        ▼
CloudWatch Alarm
        │
        ▼
EventBridge
        │
        ▼
Step Functions
        │
        ▼
Diagnosis Lambda
        │
        ▼
Amazon Bedrock
        │
        ▼
Root Cause Analysis
        │
        ▼
Human Approval
       / \
      /   \
  Reject   Approve
    │         │
    ▼         ▼
  Stop     Fix Lambda
              │
              ▼
        Infrastructure Fixed
```

Step Functions acts as the **orchestrator** that connects all these components.

---

## Why Do We Need `orchestrator.asl.json`?

Each component of the project has a specific responsibility.

For example:

* **CloudWatch** detects abnormal behavior.
* **EventBridge** triggers the workflow.
* **Diagnosis Lambda** collects and processes the problem information.
* **Amazon Bedrock** analyzes the incident and identifies a possible root cause.
* **Human approval** determines whether the proposed action should actually be executed.
* **Fix Lambda** applies the approved remediation.
* **DynamoDB** stores incident information and history.

However, these components need to run in a specific order.

Something needs to coordinate them.

That is the responsibility of **AWS Step Functions**.

The `orchestrator.asl.json` file defines this coordination logic.

---

## What Is ASL?

`ASL` stands for **Amazon States Language**.

It is a JSON-based language used to define workflows for AWS Step Functions.

For example, a workflow can be described using states such as:

```text
Task
Choice
Wait
Succeed
Fail
```

Each state represents one step or decision in the workflow.

For our project, the state machine may contain states such as:

```text
Start
  ↓
Diagnose Incident
  ↓
Wait for Human Approval
  ↓
Approval Decision
  ├── Rejected → End
  │
  └── Approved → Apply Fix
                    ↓
                  Success
```

---

## Responsibilities of the Orchestrator

### 1. Start the Diagnosis

When an infrastructure problem is detected, Step Functions starts the workflow.

The orchestrator invokes the **Diagnosis Lambda**.

```text
Step Functions
      ↓
Diagnosis Lambda
```

The Lambda receives the incident information and performs the diagnosis process.

---

### 2. Perform AI-Based Diagnosis

The Diagnosis Lambda communicates with **Amazon Bedrock**.

Bedrock analyzes the available information and produces a diagnosis containing information such as:

* Possible root cause
* Confidence
* Reasoning
* Potential blast radius
* Risk
* Estimated cost impact
* Recommended remediation

Conceptually:

```text
Incident
   ↓
Diagnosis Lambda
   ↓
Amazon Bedrock
   ↓
AI Diagnosis
```

The orchestrator is responsible for controlling what happens after this diagnosis is produced.

---

### 3. Wait for Human Approval

The system should not automatically make potentially risky infrastructure changes.

Therefore, after receiving the AI diagnosis, the workflow waits for a human decision.

```text
AI Diagnosis
     ↓
Human Approval
     ↓
 ┌───────────────┐
 │               │
Approve        Reject
 │               │
 ▼               ▼
Fix             Stop
```

This provides a **human-in-the-loop** safety mechanism.

The AI can recommend an action, but the human decides whether the action should actually be executed.

---

### 4. Handle Approval and Rejection

The orchestrator contains the decision logic.

If the user rejects the proposed remediation:

```text
Reject
  ↓
Stop Workflow
```

No infrastructure modification should be performed.

If the user approves the remediation:

```text
Approve
   ↓
Fix Lambda
```

The Fix Lambda is then invoked to perform the approved remediation.

---

### 5. Apply the Fix

After approval, Step Functions invokes the **Fix Lambda**.

```text
Human Approval
      ↓
    Approve
      ↓
   Fix Lambda
      ↓
Infrastructure Remediated
```

The Fix Lambda is responsible for actually performing the remediation action.

The orchestrator does not need to contain the implementation details of the fix.

Its responsibility is to decide **when the Fix Lambda should be executed**.

---

## Why Keep the Workflow in a Separate File?

Keeping the workflow in `orchestrator.asl.json` provides a clear separation of responsibilities.

### Lambda Functions

Lambda functions contain the actual business logic.

For example:

```text
diagnose-with-bedrock
        ↓
AI diagnosis logic
```

and

```text
apply-fix
        ↓
Infrastructure remediation logic
```

### Step Functions

Step Functions contains the orchestration logic.

```text
orchestrator.asl.json
        ↓
Workflow and state transitions
```

This makes the architecture easier to understand, test, maintain, and deploy.

---

## Example Workflow Structure

A simplified version of the state machine could look like:

```json
{
  "StartAt": "DiagnoseIncident",
  "States": {
    "DiagnoseIncident": {
      "Type": "Task"
    },

    "WaitForApproval": {
      "Type": "Task"
    },

    "CheckApproval": {
      "Type": "Choice"
    },

    "ApplyFix": {
      "Type": "Task"
    },

    "Rejected": {
      "Type": "Succeed"
    },

    "Completed": {
      "Type": "Succeed"
    }
  }
}
```

This is only a conceptual example. The actual project state machine will contain the required Lambda ARNs, input/output paths, error handling, approval mechanism, and other configuration.

---

## Role in the Project Architecture

The orchestrator sits at the center of the backend workflow:

```text
                  ┌───────────────┐
                  │   CloudWatch  │
                  └───────┬───────┘
                          │
                          ▼
                  ┌───────────────┐
                  │  EventBridge  │
                  └───────┬───────┘
                          │
                          ▼
                ┌────────────────────┐
                │   Step Functions   │
                │                    │
                │ orchestrator.asl   │
                └─────────┬──────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │ Diagnosis Lambda│
                 └────────┬────────┘
                          │
                          ▼
                   ┌─────────────┐
                   │   Bedrock   │
                   └──────┬──────┘
                          │
                          ▼
                  ┌───────────────┐
                  │Human Approval │
                  └───────┬───────┘
                          │
                    ┌─────┴─────┐
                    │           │
                 Reject       Approve
                    │           │
                    ▼           ▼
                   End     ┌───────────┐
                           │ Fix Lambda│
                           └─────┬─────┘
                                 │
                                 ▼
                         Infrastructure
                           Remediated
```

---

## Important Design Principle

The orchestrator should **coordinate the workflow, not contain the business logic of every component**.

For example, it should not contain the complete Bedrock diagnosis implementation.

Instead:

```text
Step Functions
      │
      │ "Run diagnosis"
      ▼
Diagnosis Lambda
      │
      │ "Perform diagnosis"
      ▼
Amazon Bedrock
```

Similarly, Step Functions should not contain all the infrastructure remediation code.

It should simply invoke:

```text
Step Functions
      │
      │ "Apply approved fix"
      ▼
Fix Lambda
```

This keeps the system modular.

---

## File Location

The workflow definition is stored at:

```text
statemachine/
└── orchestrator.asl.json
```

The file is later referenced by the AWS SAM/CloudFormation configuration so that the Step Functions state machine can be deployed as part of the infrastructure.

---

## In Simple Terms

Think of the `orchestrator.asl.json` file as the **workflow instruction manual** for our system.

It tells AWS:

> "When an infrastructure problem occurs, first run the diagnosis.
> After the diagnosis, wait for a human decision.
> If the human rejects the recommendation, stop.
> If the human approves it, run the fix.
> Finally, complete the workflow."

So the Lambda functions perform the **actual work**, while Step Functions and `orchestrator.asl.json` control **when and in what order that work happens**.
