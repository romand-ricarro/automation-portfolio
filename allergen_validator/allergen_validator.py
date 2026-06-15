import pandas as pd
import re
from typing import List, Dict, Tuple

class EnhancedAllergenValidator:
    def __init__(self):
        # Standard allergen categories based on London Standards
        self.standard_allergens = {
            'Celery and Celeriac': ['celery', 'celeriac'],
            'Crustaceans': ['crustacean', 'crab', 'lobster', 'shrimp', 'prawn'],
            'Dairy': ['dairy', 'milk', 'lactose', 'cheese', 'butter', 'cream'],
            'Eggs': ['egg', 'eggs'],
            'Fish': ['fish', 'salmon', 'tuna', 'cod'],
            'Gluten': ['gluten', 'wheat', 'rye', 'barley'],
            'Lupin': ['lupin'],
            'Molluscs': ['mollusc', 'mussel', 'clam', 'oyster'],
            'Mustard': ['mustard'],
            'Nuts': ['nut', 'nuts', 'almond', 'cashew', 'walnut'],
            'Peanuts': ['peanut', 'groundnut'],
            'Sesame': ['sesame'],
            'Shellfish': ['shellfish'],
            'Soybeans': ['soy', 'soya', 'soybeans'],
            'Sulphites': ['sulphite', 'sulfite', 'sulphur dioxide']
        }

        # Shorthand mapping
        self.shorthand_map = {
            'N': 'Nuts',
            'P': 'Peanuts',
            'S': 'Soybeans',
            'SH': 'Shellfish',
            'F': 'Fish',
            'M': 'Molluscs',
            'C': 'Celery and Celeriac'
        }

    def is_explicit_allergen_format(self, text: str) -> bool:
        """
        Check if text contains allergens in explicit format according to guidelines.
        """
        explicit_patterns = [
            # Standard allergen declarations
            r'allergens?:.*',
            r'contains:.*',
            r'allergènes?:.*',
            r'alérgenos?:.*',
            # Manufacturing facility statements
            r'manufactured in a facility that processes.*',
            r'made in a factory handling.*',
            r'produced in a facility with.*',
            # Cross-contamination warnings
            r'may contain.*',
            r'traces of.*',
            # Parenthetical allergen notations
            r'\([A-Z,\s]+\)'  # For shorthand notations like (N,P)
        ]
        
        text_lower = text.lower()
        return any(re.search(pattern, text_lower, re.IGNORECASE) for pattern in explicit_patterns)

    def extract_allergens(self, text: str) -> List[Dict]:
        """
        Extract allergens and their context from text following the prompt guidelines.
        """
        allergens = []
        if not self.is_explicit_allergen_format(text):
            return allergens

        # Look for explicit allergen declarations
        for pattern in [r'allergens?: (.*?)[.;]', r'contains: (.*?)[.;]']:
            matches = re.finditer(pattern, text, re.IGNORECASE)
            for match in matches:
                allergen_list = match.group(1).split(',')
                for allergen in allergen_list:
                    allergen = allergen.strip()
                    if allergen:
                        allergens.append({
                            'span': match.group(0),
                            'allergen': allergen,
                            'certainty': 'High',
                            'explanation': f"Explicitly declared as allergen"
                        })

        # Look for shorthand notations
        shorthand_matches = re.finditer(r'\(([A-Z,\s]+)\)', text)
        for match in shorthand_matches:
            codes = match.group(1).split(',')
            for code in codes:
                code = code.strip()
                if code in self.shorthand_map:
                    allergens.append({
                        'span': match.group(0),
                        'allergen': self.shorthand_map[code],
                        'certainty': 'High',
                        'explanation': f"Shorthand code {code} indicates {self.shorthand_map[code]}"
                    })

        return allergens

    def validate_prediction(self, text: str, prediction: str) -> Dict:
        """
        Validate a prediction against the text following prompt guidelines.
        """
        extracted_allergens = self.extract_allergens(text)
        
        # Case 1: Prediction claims "No Allergens" but we found explicit allergens
        if prediction == "No Allergens Found" and extracted_allergens:
            return {
                'is_valid': False,
                'confidence': 'High',
                'explanation': f"Found explicit allergens: {', '.join([a['allergen'] for a in extracted_allergens])} but prediction claims none"
            }
        
        # Case 2: Prediction claims allergens but text has no explicit format
        if prediction != "No Allergens Found" and not self.is_explicit_allergen_format(text):
            return {
                'is_valid': False,
                'confidence': 'High',
                'explanation': "Prediction includes allergens but text has no explicit allergen format"
            }
        
        # Case 3: Both prediction and extraction found allergens - compare them
        if prediction != "No Allergens Found" and extracted_allergens:
            predicted_allergens = set(a.strip() for a in prediction.split(','))
            extracted_allergen_names = set(a['allergen'] for a in extracted_allergens)
            
            if predicted_allergens != extracted_allergen_names:
                return {
                    'is_valid': False,
                    'confidence': 'Medium',
                    'explanation': f"Mismatch between predicted allergens {predicted_allergens} and extracted allergens {extracted_allergen_names}"
                }
        
        return {
            'is_valid': True,
            'confidence': 'High',
            'explanation': "Prediction matches explicit allergen format guidelines"
        }

    def batch_validate(self, df: pd.DataFrame, 
                      text_column: str,
                      prediction_column: str) -> pd.DataFrame:
        """
        Validate a batch of predictions in a DataFrame.
        """
        results = []
        for idx, row in df.iterrows():
            validation = self.validate_prediction(row[text_column], 
                                               row[prediction_column])
            results.append({
                'index': idx,
                'text': row[text_column],
                'prediction': row[prediction_column],
                'validation_result': validation['is_valid'],
                'confidence': validation['confidence'],
                'explanation': validation['explanation'],
                'extracted_allergens': self.extract_allergens(row[text_column])
            })
        
        return pd.DataFrame(results)

# Example usage
def main():
    # Example data
    data = {
        'text': [
            "A special dish in (shell) cooked with chefs own special thick sauce",
            "Allergens: Eggs, Milk, Wheat - Delicious chocolate cake",
            "Fresh garden salad (N) with honey mustard dressing"
        ],
        'prediction': [
            "Shellfish",
            "Eggs, Milk, Wheat",
            "Nuts"
        ]
    }
    
    df = pd.DataFrame(data)
    validator = EnhancedAllergenValidator()
    results = validator.batch_validate(df, 'text', 'prediction')
    
    # Print validation results
    for _, row in results.iterrows():
        print("\nText:", row['text'])
        print("Prediction:", row['prediction'])
        print("Valid:", row['validation_result'])
        print("Confidence:", row['confidence'])
        print("Explanation:", row['explanation'])
        if row['extracted_allergens']:
            print("Extracted allergens:", row['extracted_allergens'])

if __name__ == "__main__":
    main()