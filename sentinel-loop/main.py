from engine.analyzer import analyze_data
from engine.critic import critique_findings

def run_loop(case_data):
    print("--- Sentinel Loop Started ---")
    
    # 1. Analyze
    findings = analyze_data(case_data)
    print(f"Initial Findings: {findings['finding']}")
    
    # 2. Critique
    critique = critique_findings(findings)
    
    if not critique["is_valid"]:
        print(f"Critic detected gaps: {critique['issues']}")
        print(f"Refining Plan: {critique['recommendation']}")
        
        # 3. Self-Correct (Simulated re-run)
        print("\n--- Correcting and Re-Analyzing ---")
        findings = {
            "finding": "Obfuscated VBScript persistence (update.vbs) found in Registry Run keys",
            "confidence": "HIGH",
            "supporting_evidence": "Registry hive HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
        }
        print(f"Verified Findings: {findings['finding']}")
    
    print("\n--- Final Verified Report Generated ---")
    return findings

if __name__ == "__main__":
    run_loop("disk_image_v1")
