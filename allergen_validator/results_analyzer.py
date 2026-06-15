import pandas as pd
import json
from collections import Counter

class ResultsAnalyzer:
    def __init__(self, results_file):
        """Initialize with path to validation results CSV"""
        self.df = pd.read_csv(results_file)
        
    def analyze_error_patterns(self):
        """Analyze common patterns in invalid predictions"""
        # Filter for invalid predictions
        invalid_predictions = self.df[~self.df['validation_result']]
        
        # Count common explanations
        explanation_counts = Counter(invalid_predictions['explanation'])
        
        print("\nCommon Error Patterns:")
        for explanation, count in explanation_counts.most_common():
            print(f"\n- Found {count} cases: {explanation}")
            # Show an example
            example = invalid_predictions[invalid_predictions['explanation'] == explanation].iloc[0]
            print(f"  Example text: {example['text']}")
            print(f"  Prediction: {example['prediction']}")
    
    def suggest_improvements(self):
        """Suggest improvements for ML model based on error patterns"""
        # Count types of invalid predictions
        no_explicit_format = self.df[
            (self.df['explanation'].str.contains('no explicit', case=False, na=False)) &
            (~self.df['validation_result'])
        ]
        
        mismatch_cases = self.df[
            (self.df['explanation'].str.contains('mismatch', case=False, na=False)) &
            (~self.df['validation_result'])
        ]
        
        print("\nSuggested Improvements:")
        
        if len(no_explicit_format) > 0:
            print("\n1. Over-prediction Cases:")
            print(f"   Found {len(no_explicit_format)} cases where ML predicted allergens without explicit labeling")
            print("   Suggestion: Adjust ML model to only trigger on explicit allergen declarations")
            
        if len(mismatch_cases) > 0:
            print("\n2. Mismatch Cases:")
            print(f"   Found {len(mismatch_cases)} cases where predicted allergens didn't match explicit labels")
            print("   Suggestion: Fine-tune ML model's allergen recognition patterns")
    
    def export_correction_suggestions(self):
        """Export suggested corrections for ML predictions"""
        corrections = []
        
        for _, row in self.df[~self.df['validation_result']].iterrows():
            correction = {
                'text': row['text'],
                'current_prediction': row['prediction'],
                'suggested_correction': 'No Allergens Found' if 'no explicit' in str(row['explanation']).lower()
                                     else row['extracted_allergens'],
                'reason': row['explanation']
            }
            corrections.append(correction)
        
        # Save to CSV
        corrections_df = pd.DataFrame(corrections)
        corrections_df.to_csv('suggested_corrections.csv', index=False)
        print("\nExported correction suggestions to 'suggested_corrections.csv'")
    
    def generate_report(self):
        """Generate a comprehensive analysis report"""
        total = len(self.df)
        invalid = len(self.df[~self.df['validation_result']])
        
        print("\n=== Validation Analysis Report ===")
        print(f"\nOverall Statistics:")
        print(f"Total predictions analyzed: {total}")
        print(f"Invalid predictions found: {invalid}")
        print(f"Accuracy rate: {((total-invalid)/total)*100:.2f}%")
        
        self.analyze_error_patterns()
        self.suggest_improvements()
        self.export_correction_suggestions()

# Example usage
def main():
    analyzer = ResultsAnalyzer('validation_results.csv')
    analyzer.generate_report()

if __name__ == "__main__":
    main()