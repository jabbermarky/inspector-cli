#!/bin/bash

# Run phased analysis on individual sites to avoid token limits
echo "Running phased analysis on individual sites..."

# WordPress sites that are likely to work (smaller, simpler)
wordpress_sites=(
    "https://wordpress.org"
    "https://jquery.com"
    "https://css-tricks.com"
)

# Drupal sites
drupal_sites=(
    "https://www.drupal.org"
    "https://www.uscis.gov"
    "https://www.un.org/en"
)

# Joomla sites
joomla_sites=(
    "https://joomla.org"
    "https://www.frva.com"
    "https://sclak.mobi"
)

# Duda sites
duda_sites=(
    "https://mlspin.com"
    "https://www.rapport3.com"
    "https://www.awardspring.com"
)

echo "=== Running WordPress sites ==="
for site in "${wordpress_sites[@]}"; do
    echo "Processing: $site"
    node dist/index.js learn "$site" --phased-analysis
    echo "---"
done

echo "=== Running Drupal sites ==="
for site in "${drupal_sites[@]}"; do
    echo "Processing: $site"
    node dist/index.js learn "$site" --phased-analysis
    echo "---"
done

echo "=== Running Joomla sites ==="
for site in "${joomla_sites[@]}"; do
    echo "Processing: $site"
    node dist/index.js learn "$site" --phased-analysis
    echo "---"
done

echo "=== Running Duda sites ==="
for site in "${duda_sites[@]}"; do
    echo "Processing: $site"
    node dist/index.js learn "$site" --phased-analysis
    echo "---"
done

echo "Done! Results stored in data/learn/"