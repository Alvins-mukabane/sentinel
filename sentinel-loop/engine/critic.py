def critique_findings(findings):
    print("Critic: Evaluating findings...")
    # The "Wow" factor logic
    if "svchost.exe" in findings["finding"]:
        return {
            "is_valid": False,
            "issues": [
                "Finding lacks process evidence",
                "No correlation between disk and memory artifacts",
                "svchost.exe in Public folder is a known decoy pattern"
            ],
            "recommendation": "Perform memory analysis and check registry for Run keys"
        }
    return {"is_valid": True}
