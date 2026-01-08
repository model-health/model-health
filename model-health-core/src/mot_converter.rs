//! Convert OpenSim .mot (motion) files to CSV format

use std::io::{BufRead, BufReader, Write};

const COMMENT_PREFIXES: &[&str] = &["#", "//", "%"];

fn is_comment_or_blank(line: &str) -> bool {
    let trimmed = line.trim();
    if trimmed.is_empty() {
        return true;
    }
    for prefix in COMMENT_PREFIXES {
        if trimmed.starts_with(prefix) {
            return true;
        }
    }
    false
}

/// Parse header section (key=value pairs, possibly terminated by 'endheader')
/// Returns (header_dict, index_of_line_after_header)
fn parse_header(lines: &[String]) -> (std::collections::HashMap<String, String>, usize) {
    let mut header = std::collections::HashMap::new();
    let mut i = 0;
    
    while i < lines.len() && is_comment_or_blank(&lines[i]) {
        i += 1;
    }
    
    while i < lines.len() {
        let line = lines[i].trim();
        if line.is_empty() {
            i += 1;
            continue;
        }
        
        if line.to_lowercase().starts_with("endheader") {
            i += 1;
            break;
        }
        
        if line.contains('=') {
            if let Some((key, value)) = line.split_once('=') {
                header.insert(key.trim().to_string(), value.trim().to_string());
                i += 1;
                continue;
            }
        }
        
        let tokens: Vec<&str> = line.split_whitespace().collect();
        if !tokens.is_empty() && tokens.iter().any(|tok| tok.chars().any(|c| c.is_alphabetic() || c == '_')) {
            break;
        }
        
        break;
    }
    
    (header, i)
}

/// Find column labels and data start index
/// Returns (labels, data_start_idx)
fn find_labels_and_data_start(lines: &[String], start_idx: usize) -> (Vec<String>, usize) {
    let mut i = start_idx;
    
    while i < lines.len() && is_comment_or_blank(&lines[i]) {
        i += 1;
    }
    
    if i >= lines.len() {
        return (vec![], i);
    }
    
    let first_nonblank = lines[i].trim();
    let tokens: Vec<&str> = first_nonblank.split_whitespace().collect();
    
    if tokens.iter().any(|tok| tok.chars().any(|c| c.is_alphabetic() || c == '_')) {
        let labels = tokens.iter().map(|s| s.to_string()).collect();
        return (labels, i + 1);
    }
    
    (vec![], i)
}

/// Parse a numeric row from a line
fn parse_numeric_row(line: &str) -> Option<Vec<f64>> {
    let mut clean_line = line;
    for prefix in COMMENT_PREFIXES {
        if let Some(pos) = line.find(prefix) {
            clean_line = &line[..pos];
            break;
        }
    }
    
    let parts: Vec<&str> = clean_line.trim().split_whitespace().collect();
    if parts.is_empty() {
        return None;
    }
    
    let mut vals = Vec::new();
    for tok in parts {
        match tok.parse::<f64>() {
            Ok(v) => vals.push(v),
            Err(_) => return None, // Skip line if any token is unparseable
        }
    }
    
    Some(vals)
}

/// Convert MOT file bytes to CSV bytes
pub fn mot_to_csv(mot_data: &[u8]) -> Result<Vec<u8>, String> {
    let reader = BufReader::new(mot_data);
    let lines: Vec<String> = reader
        .lines()
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read MOT data: {}", e))?;
    
    let (header, after_header_idx) = parse_header(&lines);
    
    let (mut labels, data_start_idx) = find_labels_and_data_start(&lines, after_header_idx);
    
    if labels.is_empty() {
        let mut ncols: Option<usize> = None;
        
        if let Some(nc) = header.get("nColumns") {
            ncols = nc.parse().ok();
        }
        
        let mut i = data_start_idx;
        while i < lines.len() && is_comment_or_blank(&lines[i]) {
            i += 1;
        }
        
        if i < lines.len() {
            if let Some(numeric) = parse_numeric_row(&lines[i]) {
                ncols = Some(ncols.unwrap_or(numeric.len()));
            }
        }
        
        let ncols = ncols.ok_or("Could not determine number of columns")?;
        
        labels = vec!["time".to_string()];
        for i in 1..ncols {
            labels.push(format!("col{}", i));
        }
    }
    
    let mut csv_output = Vec::new();
    
    writeln!(&mut csv_output, "{}", labels.join(","))
        .map_err(|e| format!("Failed to write CSV header: {}", e))?;
    
    let mut i = data_start_idx;
    while i < lines.len() {
        let line = &lines[i];
        i += 1;
        
        if is_comment_or_blank(line) {
            continue;
        }
        
        if let Some(mut vals) = parse_numeric_row(line) {
            if vals.len() > labels.len() {
                vals.truncate(labels.len());
            } else if vals.len() < labels.len() {
                vals.resize(labels.len(), 0.0);
            }
            
            let row: Vec<String> = vals.iter().map(|v| format!("{:.1}", v)).collect();
            writeln!(&mut csv_output, "{}", row.join(","))
                .map_err(|e| format!("Failed to write CSV row: {}", e))?;
        }
    }
    
    Ok(csv_output)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_simple_mot_conversion() {
        let mot_data = b"nRows=3\nnColumns=2\nendheader\ntime\tvalue\n0.0\t1.0\n0.1\t2.0\n0.2\t3.0\n";
        
        let csv = mot_to_csv(mot_data).unwrap();
        let csv_str = String::from_utf8(csv).unwrap();
        
        println!("CSV output:\n{}", csv_str);
        
        assert!(csv_str.contains("time,value"));
        assert!(csv_str.contains("0.0,1.0"));
    }
}
