import csv

input_file = 'us_cities.csv'
output_file = 'us_cities_fixed.csv'

# Define the new headers matching our Supabase schema
new_headers = ['city', 'state_short', 'state_full', 'county', 'city_alias']

try:
    with open(input_file, 'r', encoding='utf-8') as infile, \
         open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        
        # Reader handles the pipe delimiter
        reader = csv.reader(infile, delimiter='|')
        writer = csv.writer(outfile, delimiter=',')

        # Skip original header
        next(reader)

        # Write new header
        writer.writerow(new_headers)

        # Write rows
        for row in reader:
            writer.writerow(row)

    print(f"Successfully converted {input_file} to {output_file}")

except Exception as e:
    print(f"Error: {e}")
