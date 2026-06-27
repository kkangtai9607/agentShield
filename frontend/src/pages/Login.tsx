import { useEffect, useState } from 'react'

import { Button, Card, Form, Input, Space, Typography, message } from 'antd'

import { useNavigate } from 'react-router-dom'

import { api } from '../api/client'

import { setAuth } from '../utils/auth'

import { resolveRoleLabel } from '../utils/roleLabels'



interface DemoAccount {

  username: string

  password: string

  role: string

  name: string

  label?: string

}



export default function Login() {

  const navigate = useNavigate()

  const [loading, setLoading] = useState(false)

  const [authDisabled, setAuthDisabled] = useState(false)

  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([])

  const [profileName, setProfileName] = useState('')



  useEffect(() => {

    api.health().then((res) => {

      if (res.data.auth_disabled) {

        setAuthDisabled(true)

        setAuth('disabled', { user_id: 'demo', user_role: 'admin', name: '鉴权已关闭' })

        navigate('/', { replace: true })

      }

      if (res.data.profile_name) setProfileName(res.data.profile_name)

    }).catch(() => {})



    api.getDemoAccounts().then((res) => setDemoAccounts(res.data)).catch(() => {})

  }, [navigate])



  const doLogin = async (username: string, password: string) => {

    setLoading(true)

    try {

      const res = await api.login(username, password)

      setAuth(res.data.access_token, {

        user_id: res.data.user_id,

        user_role: res.data.user_role,

        name: res.data.name,

      })

      message.success(`欢迎，${res.data.name}`)

      navigate('/', { replace: true })

    } catch {

      message.error('登录失败，请检查用户名和密码')

    } finally {

      setLoading(false)

    }

  }



  return (

    <div

      style={{

        minHeight: '100vh',

        display: 'flex',

        alignItems: 'center',

        justifyContent: 'center',

        background: 'linear-gradient(135deg, #f0f5ff 0%, #ffffff 100%)',

        padding: 24,

      }}

    >

      <Card style={{ width: 440, borderRadius: 12, boxShadow: '0 8px 32px rgba(15,35,70,0.08)' }}>

        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 8 }}>

          AgentShield

        </Typography.Title>

        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>

          通用智能体工具调用安全网关 · 登录后 JWT 签发身份，策略由场景包控制

          {profileName && (

            <>

              <br />

              当前场景：<Typography.Text strong>{profileName}</Typography.Text>

            </>

          )}

        </Typography.Paragraph>



        <Form layout="vertical" onFinish={(v) => doLogin(v.username, v.password)}>

          <Form.Item name="username" label="用户名" rules={[{ required: true }]}>

            <Input placeholder="见下方当前场景演示账号" />

          </Form.Item>

          <Form.Item name="password" label="密码" rules={[{ required: true }]}>

            <Input.Password placeholder="演示密码见快捷登录" />

          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>

            登录

          </Button>

        </Form>



        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 20, marginBottom: 8 }}>

          当前场景演示账号（可在策略中心切换场景）：

        </Typography.Text>

        <Space wrap>

          {demoAccounts.map((acc) => (

            <Button

              key={acc.username}

              loading={loading}

              onClick={() => doLogin(acc.username, acc.password)}

            >

              {acc.name}（{resolveRoleLabel(acc.role)}）

            </Button>

          ))}

        </Space>

      </Card>

    </div>

  )

}

