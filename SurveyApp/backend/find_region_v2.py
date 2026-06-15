import psycopg2
import sys

project_ref = "hselrudhddlwfviqgefw"
password = "GnnhZf7nuj82jLTl"
user = f"postgres.{project_ref}"

# Exhaustive list of pooler endpoints
regions = [
    # US
    "aws-0-us-east-1", "aws-0-us-east-2", 
    "aws-0-us-west-1", "aws-0-us-west-2",
    # EU
    "aws-0-eu-central-1", "aws-0-eu-west-1", "aws-0-eu-west-2", "aws-0-eu-west-3", "aws-0-eu-north-1",
    # AP
    "aws-0-ap-southeast-1", "aws-0-ap-southeast-2", 
    "aws-0-ap-northeast-1", "aws-0-ap-northeast-2", "aws-0-ap-northeast-3",
    "aws-0-ap-south-1", "aws-0-ap-east-1",
    # SA
    "aws-0-sa-east-1",
    # CA
    "aws-0-ca-central-1"
]

print(f"Brute-forcing Supabase pooler regions for project {project_ref}...")

success = False

for region in regions:
    host = f"{region}.pooler.supabase.com"
    dsn = f"dbname=postgres user={user} password={password} host={host} port=6543"
    
    print(f"Checking {region}...", end=" ")
    sys.stdout.flush()
    try:
        conn = psycopg2.connect(dsn, connect_timeout=4)
        print("SUCCESS! Connected.")
        conn.close()
        print(f"\n:::FOUND_REGION:{region}:::")
        success = True
        break
    except psycopg2.OperationalError as e:
        msg = str(e)
        if "Tenant or user not found" in msg:
            print("Tenant not found")
        elif "password authentication failed" in msg:
            print("FOUND REGION (Wrong Password)")
            print(f"\n:::FOUND_REGION:{region}:::")
            success = True
            break
        elif "timeout" in msg:
             print("Timeout")
        else:
            print(f"Error ({msg})")
    except Exception as e:
        print(f"Unexpected error: {e}")

if not success:
    print("\nCould not find project in any known pooler region.")
