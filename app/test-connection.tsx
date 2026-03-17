import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function TestConnection() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [healthStatus, setHealthStatus] = useState('idle');
  const [loginStatus, setLoginStatus] = useState('idle');
  const [proxyStatus, setProxyStatus] = useState('idle');
  const [healthResult, setHealthResult] = useState('等待测试...');
  const [loginResult, setLoginResult] = useState('等待测试...');
  const [proxyResult, setProxyResult] = useState('等待测试...');

  const getApiBaseUrl = () => {
    if (typeof window === 'undefined') return 'http://localhost:3000';
    
    const currentUrl = window.location.origin;
    console.log('Current URL:', currentUrl);
    
    let apiUrl = currentUrl;
    if (apiUrl.includes('://8081-')) {
      apiUrl = apiUrl.replace('://8081-', '://3000-');
    } else if (apiUrl.endsWith(':8081')) {
      apiUrl = apiUrl.replace(':8081', ':3000');
    } else if (apiUrl.includes(':8081/')) {
      apiUrl = apiUrl.replace(':8081/', ':3000/');
    }
    
    console.log('API Base URL:', apiUrl);
    return apiUrl;
  };

  const API_BASE_URL = getApiBaseUrl();

  const testHealth = async () => {
    setHealthStatus('loading');
    setHealthResult('测试中...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`);
      const data = await response.json();
      
      setHealthStatus('success');
      setHealthResult(`✅ 后端正常\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setHealthStatus('error');
      setHealthResult(`❌ 错误: ${error.message}`);
    }
  };

  const testProxy = async () => {
    setProxyStatus('loading');
    setProxyResult('测试中...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/api/health`);
      const data = await response.json();
      
      setProxyStatus('success');
      setProxyResult(`✅ 代理正常\n${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setProxyStatus('error');
      setProxyResult(`❌ 错误: ${error.message}`);
    }
  };

  const testLogin = async () => {
    if (!username || !password) {
      setLoginResult('❌ 请输入用户名和密码');
      return;
    }
    
    setLoginStatus('loading');
    setLoginResult('测试中...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/proxy/api/trpc/auth.loginWithUserAccount`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ json: { username, password } }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const result = data?.result?.data?.json;
        if (result?.success) {
          setLoginStatus('success');
          setLoginResult(`✅ 登录成功\n用户: ${result.user.name}\nToken: ${result.token.substring(0, 50)}...`);
        } else {
          setLoginStatus('error');
          setLoginResult(`❌ 登录失败\n${result?.message || '未知错误'}`);
        }
      } else {
        setLoginStatus('error');
        setLoginResult(`❌ HTTP ${response.status}\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (error: any) {
      setLoginStatus('error');
      setLoginResult(`❌ 错误: ${error.message}`);
    }
  };

  const runAllTests = async () => {
    await testHealth();
    await new Promise(r => setTimeout(r, 500));
    await testProxy();
    await new Promise(r => setTimeout(r, 500));
    await testLogin();
  };

  const clearResults = () => {
    setHealthStatus('idle');
    setLoginStatus('idle');
    setProxyStatus('idle');
    setHealthResult('等待测试...');
    setLoginResult('等待测试...');
    setProxyResult('等待测试...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'loading':
        return '#ffa500';
      case 'success':
        return '#4caf50';
      case 'error':
        return '#f44336';
      default:
        return '#ccc';
    }
  };

  const getResultStyle = (status: string) => {
    switch (status) {
      case 'success':
        return { ...styles.result, borderLeftColor: '#4caf50', backgroundColor: '#f1f8f4', color: '#2e7d32' };
      case 'error':
        return { ...styles.result, borderLeftColor: '#f44336', backgroundColor: '#fef5f5', color: '#c62828' };
      default:
        return styles.result;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🔗 前端测试连接</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>💡 这个页面用来测试前端与后端的连接。点击下面的按钮进行测试。</Text>
        </View>

        {/* 后端健康检查 */}
        <View style={styles.testSection}>
          <View style={styles.testTitle}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(healthStatus) }]} />
            <Text style={styles.testTitleText}>后端健康检查</Text>
          </View>
          <Text style={getResultStyle(healthStatus)}>{healthResult}</Text>
        </View>

        {/* 代理测试 */}
        <View style={styles.testSection}>
          <View style={styles.testTitle}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(proxyStatus) }]} />
            <Text style={styles.testTitleText}>代理测试</Text>
          </View>
          <Text style={getResultStyle(proxyStatus)}>{proxyResult}</Text>
        </View>

        {/* 登录测试 */}
        <View style={styles.testSection}>
          <View style={styles.testTitle}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(loginStatus) }]} />
            <Text style={styles.testTitleText}>登录测试</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="用户名"
            value={username}
            onChangeText={setUsername}
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, { marginBottom: 12 }]}
            placeholder="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#999"
          />
          <Text style={getResultStyle(loginStatus)}>{loginResult}</Text>
        </View>

        {/* 按钮组 */}
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.btnPrimary} onPress={runAllTests}>
            <Text style={styles.btnText}>运行所有测试</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSecondary} onPress={clearResults}>
            <Text style={styles.btnSecondaryText}>清除结果</Text>
          </TouchableOpacity>
        </View>

        {/* API 地址显示 */}
        <View style={styles.apiInfo}>
          <Text style={styles.apiInfoLabel}>API 基础地址:</Text>
          <Text style={styles.apiInfoValue}>{API_BASE_URL}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
    padding: 12,
    borderRadius: 4,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 13,
    color: '#1565c0',
  },
  testSection: {
    marginBottom: 20,
  },
  testTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  testTitleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  result: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#ccc',
    padding: 12,
    borderRadius: 4,
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    maxHeight: 200,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    marginBottom: 8,
    fontSize: 14,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: '#667eea',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnSecondary: {
    flex: 1,
    backgroundColor: '#e0e0e0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  btnSecondaryText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  apiInfo: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 4,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  apiInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  apiInfoValue: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    flexWrap: 'wrap',
  },
});
