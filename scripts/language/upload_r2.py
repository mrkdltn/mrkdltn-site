#!/usr/bin/env python3
"""Upload the name-stripped Report Language corpus to the private R2 bucket.

Uploads ONLY what is safe to keep away from this repository's owner's machine:
  parsed/<urn>.json   section text with every name removed (see docs/report-language/parse-audit.md)
  parsed/index.csv    the internal key (URN, dates, PDF address, checksums, parse warnings)
  manifest.jsonl      what was read and when
Never uploaded: raw extracted text (text/), anything in restricted/ or secrets/, or parsed/check.json (it quotes
residual name-check hits for reading by eye).

Credentials come from the environment (GitHub Actions secrets): R2_ACCOUNT_ID, R2_ACCESS_KEY_ID,
R2_SECRET_ACCESS_KEY. Bucket: mrkdltn-report-language (private; created 26 November 2026).

  python3 scripts/language/upload_r2.py --data DIR [--prefix v1/]
"""
import argparse, glob, os, sys

BUCKET = 'mrkdltn-report-language'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', required=True)
    ap.add_argument('--prefix', default='v1/')
    a = ap.parse_args()
    import boto3
    acct = os.environ['R2_ACCOUNT_ID'].strip()
    s3 = boto3.client('s3', endpoint_url=f'https://{acct}.r2.cloudflarestorage.com',
                      aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'].strip(),
                      aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'].strip(), region_name='auto')
    files = sorted(glob.glob(os.path.join(a.data, 'parsed', '*.json')))
    files = [f for f in files if os.path.basename(f) != 'check.json']
    files += [os.path.join(a.data, 'parsed', 'index.csv'), os.path.join(a.data, 'manifest.jsonl')]
    n = 0
    for f in files:
        if not os.path.exists(f):
            continue
        rel = os.path.relpath(f, a.data).replace(os.sep, '/')
        if rel.startswith(('text/', 'restricted/', 'secrets/')):
            sys.exit(f'refusing to upload {rel}')
        ct = 'application/json' if f.endswith('.json') else 'text/csv' if f.endswith('.csv') else 'application/x-ndjson'
        s3.upload_file(f, BUCKET, a.prefix + rel, ExtraArgs={'ContentType': ct})
        n += 1
    print(f'uploaded {n} files to r2://{BUCKET}/{a.prefix}')


if __name__ == '__main__':
    main()
