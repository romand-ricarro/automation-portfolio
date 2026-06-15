import pandas as pd
from allergen_validator import EnhancedAllergenValidator

def run_validation(file_path):
    # Read the CSV file
    print("Reading data file...")
    df = pd.read_csv(file_path)
    
    # Initialize validator
    print("Initializing validator...")
    validator = EnhancedAllergenValidator()
    
    # Run validation
    print("Running validation...")
    results = validator.batch_validate(df, 'text', 'ml_prediction')
    
    # Save results to CSV
    output_path = 'validation_results.csv'
    results.to_csv(output_path, index=False)
    print(f"Results saved to {output_path}")
    
    # Print summary
    total = len(results)
    invalid = len(results[~results['validation_result']])
    print(f"\nSummary:")
    print(f"Total predictions analyzed: {total}")
    print(f"Invalid predictions found: {invalid}")
    print(f"Accuracy rate: {((total-invalid)/total)*100:.2f}%")
    
    return results

if __name__ == "__main__":
    # Replace this with your file path
    file_path = "data.csv"
    results = run_validation(file_path)