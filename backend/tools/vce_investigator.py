import sys
import os
import math
import binascii

def calculate_entropy(data):
    """Calculate Shannon entropy of data to detect encryption/compression."""
    if not data:
        return 0
    entropy = 0
    for x in range(256):
        p_x = float(data.count(x)) / len(data)
        if p_x > 0:
            entropy += - p_x * math.log(p_x, 2)
    return entropy

def analyze_vce(file_path):
    print(f"[*] Analyzing: {file_path}")
    
    if not os.path.exists(file_path):
        print(f"[!] File not found: {file_path}")
        return

    file_size = os.path.getsize(file_path)
    print(f"[*] Size: {file_size} bytes ({file_size/1024:.2f} KB)")

    with open(file_path, 'rb') as f:
        header = f.read(100)
        f.seek(0)
        content = f.read()

    # Hex Dump of Header
    print("\n[+] Header Hex Dump (First 100 bytes):")
    print(binascii.hexlify(header).decode('utf-8'))
    
    # Check Magic Bytes
    print("\n[+] Magic Bytes Check:")
    if header.startswith(b'SQLite format 3'):
        print(" -> Detected: SQLite Database (Standard)")
    elif header.startswith(b'PK\x03\x04'):
        print(" -> Detected: ZIP Archive")
    else:
        print(" -> Unknown format. Likely Custom Binary or Encrypted.")

    # Entropy Check
    entropy = calculate_entropy(content)
    print(f"\n[+] File Entropy: {entropy:.4f}")
    if entropy > 7.5:
        print(" -> High entropy! Likely COMPRESSED or ENCRYPTED.")
    else:
        print(" -> Low/Medium entropy. Likely contains plaintext or standard structure.")

    # String extraction (basic)
    print("\n[+] String Sample (first 20 printable strings > 4 chars):")
    try:
        from string import printable
        chars = []
        found = 0
        for byte in content:
            char = chr(byte)
            if char in printable:
                chars.append(char)
            else:
                if len(chars) >= 4:
                    print(f"  - {''.join(chars)}")
                    found += 1
                    if found >= 20:
                        break
                chars = []
    except Exception as e:
        print(f"Error extracting strings: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python vce_investigator.py <path_to_vce_file>")
    else:
        analyze_vce(sys.argv[1])
