import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { DesignDifference } from './DifferenceDetector';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
    marginTop: 20,
    color: '#334155',
  },
  difference: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 5,
  },
  description: {
    fontSize: 12,
    marginBottom: 5,
  },
  priority: {
    fontSize: 10,
    color: '#ef4444',
    marginBottom: 5,
  },
  comment: {
    fontSize: 10,
    color: '#64748b',
    marginLeft: 10,
    marginTop: 2,
  },
  timestamp: {
    fontSize: 8,
    color: '#94a3b8',
    marginTop: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 10,
  },
});

interface DifferenceReportProps {
  differences: DesignDifference[];
}

export function DifferenceReport({ differences }: DifferenceReportProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.section}>
          <Text style={styles.title}>Reporte de Diferencias de Diseño</Text>
          
          <Text style={styles.subtitle}>Resumen de Diferencias</Text>
          {differences.map((diff, index) => (
            <View key={index} style={styles.difference}>
              <Text style={styles.description}>{diff.description}</Text>
              {diff.priority === 'high' && (
                <Text style={styles.priority}>Alta Prioridad</Text>
              )}
              
              {diff.comments && diff.comments.length > 0 && (
                <>
                  <Text style={{ ...styles.description, marginTop: 5 }}>
                    Comentarios:
                  </Text>
                  {diff.comments.map((comment, i) => (
                    <View key={i}>
                      <Text style={styles.comment}>{comment.text}</Text>
                      <Text style={styles.timestamp}>{comment.timestamp}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          ))}
        </View>
        
        <Text style={styles.footer}>
          Generado el {new Date().toLocaleString()}
        </Text>
      </Page>
    </Document>
  );
}
