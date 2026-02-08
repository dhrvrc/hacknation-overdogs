"""Check actual column names in Excel file"""
import pandas as pd

xl = pd.ExcelFile('SupportMind_Final_Data.xlsx')

print('All sheet names:')
for name in xl.sheet_names:
    print(f'  - {name}')

print('\n' + '='*70)

sheets_to_check = ['Knowledge_Articles', 'Scripts_Master', 'Tickets', 'Conversations']

for sheet in sheets_to_check:
    df = pd.read_excel('SupportMind_Final_Data.xlsx', sheet_name=sheet, nrows=1)
    print(f'\n{sheet} columns:')
    for col in df.columns:
        print(f'  - {col}')
