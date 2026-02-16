import csv
import subprocess
import os

def run_import():
    csv_file = 'us_cities.csv'
    project_id = 'rddqcxfalrlmlvirjlca'
    batch_size = 2000
    current_batch = []
    batch_count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='|')
        
        for row in reader:
            city = row['City'].replace("'", "''")
            state_id = row['State short'].replace("'", "''")
            state_name = row['State full'].replace("'", "''")
            county = row['County'].replace("'", "''")
            
            current_batch.append(f"('{city}', '{state_id}', '{state_name}', '{county}')")
            
            if len(current_batch) >= batch_size:
                sql = f"INSERT INTO public.cities (city, state_id, state_name, county) VALUES {', '.join(current_batch)} ON CONFLICT (city, state_id, county) DO NOTHING;"
                batch_count += 1
                execute_batch(project_id, sql, batch_count)
                current_batch = []
        
        if current_batch:
            sql = f"INSERT INTO public.cities (city, state_id, state_name, county) VALUES {', '.join(current_batch)} ON CONFLICT (city, state_id, county) DO NOTHING;"
            batch_count += 1
            execute_batch(project_id, sql, batch_count)

def execute_batch(project_id, sql, batch_num):
    print(f"Executing batch {batch_num}...")
    # Escape single quotes for shell command if needed, but since we are using subprocess with list, it handles it.
    try:
        # We can't call MCP directly from Python script easily without knowing the environment,
        # so we will just print the SQL and the agent will run it? 
        # No, let's just make the script write to separate files and the agent will run them.
        with open(f"batches/batch_{batch_num}.sql", "w") as f:
            f.write(sql)
    except Exception as e:
        print(f"Error writing batch {batch_num}: {e}")

if __name__ == "__main__":
    if not os.path.exists('batches'):
        os.makedirs('batches')
    run_import()
