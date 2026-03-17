import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const CRM_API = 'https://crm.bdsm.com.cn/api/trpc';

export default function TestConnection() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState('等待测试...');
  const [status, setStatus] = useState('idle');

  const testLogin = async () => {
    setStatus('loading');
    try {
      const resp = await fetch(`${CRM_API}/auth.login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ json: { username, password } }),
      });
      const data = await resp.json();
      setResult(JSON.stringify(data, null, 2));
      setStatus(resp.ok ? 'success' : 'error');
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
      setStatus('error');
    }
  };

  const testCourses = async () => {
    setStatus('loading');
    try {
      const resp = await fetch(`${CRM_API}/courses.list`);
      const data = await resp.json();
      setResult(JSON.stringify(data, null, 2).slice(0, 2000));
      setStatus(resp.ok ? 'success' : 'error');
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
      setStatus('error');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API 连接测试</Text>
      <Text style={styles.subtitle}>CRM: {CRM_API}</Text>

      <TextInput style={styles.input} placeholder="用户名" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="密码" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity style={styles.button} onPress={testLogin}>
        <Text style={styles.buttonText}>测试登录</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={testCourses}>
        <Text style={styles.buttonText}>测试课程列表</Text>
      </TouchableOpacity>

      <View style={[styles.resultBox, status === 'success' && styles.success, status === 'error' && styles.error]}>
        <Text style={styles.resultText}>{result}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { fontSize: 12, color: '#888', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 10 },
  button: { backgroundColor: '#6366f1', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  buttonText: { color: '#fff', fontWeight: '600' },
  resultBox: { padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', marginTop: 10 },
  resultText: { fontSize: 12, fontFamily: 'monospace' },
  success: { backgroundColor: '#dcfce7' },
  error: { backgroundColor: '#fef2f2' },
});
